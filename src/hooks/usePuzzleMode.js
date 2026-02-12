import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { loadPuzzles, getGroupedRoadmap } from '../utils/puzzleLoader';
import { saveResult, getAllResults } from '../utils/db';

/**
 * Rehabilitates an incomplete FEN string by adding missing fields
 */
const rehabilitateFen = (fen) => {
    if (!fen) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const fields = fen.split(' ').filter(f => f !== '');
    if (fields.length >= 6) return fen;

    const defaults = ['w', '-', '-', '0', '1'];
    const currentFields = [...fields];
    for (let i = currentFields.length; i < 6; i++) {
        currentFields.push(defaults[i - 1] || '0');
    }
    return currentFields.join(' ');
};

/**
 * Custom hook for puzzle mode state and logic
 */
const usePuzzleMode = () => {
    // Puzzle data
    const [puzzles, setPuzzles] = useState([]);
    const [roadmapData, setRoadmapData] = useState([]);
    const [solvedResults, setSolvedResults] = useState({});

    // Current puzzle state
    const [currentPuzzle, setCurrentPuzzle] = useState(null);
    const [puzzleIndex, setPuzzleIndex] = useState(() => {
        const saved = localStorage.getItem('chess-puzzle-index');
        return saved ? parseInt(saved, 10) : 0;
    });

    // Board state
    const [fen, setFen] = useState('start');
    const [moveIndex, setMoveIndex] = useState(0);
    const [feedback, setFeedback] = useState(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [resetCounter, setResetCounter] = useState(0);

    // Hints
    const [hintMove, setHintMove] = useState(null);
    const [hintsUsed, setHintsUsed] = useState(0);

    // UI state
    const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
    const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

    // Refs
    const gameRef = useRef(new Chess());
    const timeoutsRef = useRef([]);

    // Safe timeout wrapper for cleanup
    const safeTimeout = useCallback((callback, delay) => {
        const id = setTimeout(() => {
            callback();
            // Remove from tracking after execution
            timeoutsRef.current = timeoutsRef.current.filter(t => t !== id);
        }, delay);
        timeoutsRef.current.push(id);
        return id;
    }, []);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach(clearTimeout);
            timeoutsRef.current = [];
        };
    }, []);

    // Load puzzles on mount
    useEffect(() => {
        const initialIndex = puzzleIndex; // Capture initial value

        loadPuzzles().then(async data => {
            console.log('Loaded puzzles:', data.length);
            setPuzzles(data);
            setRoadmapData(getGroupedRoadmap(data));

            try {
                const results = await getAllResults();
                setSolvedResults(results);
            } catch (err) {
                console.error('Failed to load IndexedDB results:', err);
            }

            if (data.length > 0) {
                const idx = initialIndex < data.length ? initialIndex : 0;
                startPuzzleInternal(data[idx]);
            }
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Save progress to localStorage
    useEffect(() => {
        localStorage.setItem('chess-puzzle-index', puzzleIndex.toString());
    }, [puzzleIndex]);

    // Internal start puzzle function
    const startPuzzleInternal = useCallback((puzzle) => {
        setCurrentPuzzle(puzzle);
        const safeFen = rehabilitateFen(puzzle.Fen);
        setFen(safeFen);
        gameRef.current = new Chess(safeFen);
        setMoveIndex(0);
        setFeedback(null);
        setIsCompleted(false);
        setHintMove(null);
        setHintsUsed(0);
        setIsInstructionsOpen(false);
    }, []);

    // Automated opponent moves
    useEffect(() => {
        if (!currentPuzzle || isCompleted) return;

        const movesArr = currentPuzzle.Moves.split(' ');
        const isOpponentTurn = moveIndex % 2 === 0;

        if (isOpponentTurn && moveIndex < movesArr.length) {
            const timer = safeTimeout(() => {
                if (moveIndex % 2 === 0) {
                    makeMoveInternal(movesArr[moveIndex]);
                }
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [moveIndex, currentPuzzle, isCompleted, safeTimeout]); // eslint-disable-line react-hooks/exhaustive-deps

    // Internal make move function
    const makeMoveInternal = useCallback((moveInput) => {
        if (!currentPuzzle) return false;

        try {
            const movesArr = currentPuzzle.Moves.split(' ');
            const expectedMoveStr = movesArr[moveIndex];

            if (typeof moveInput === 'string' && moveInput !== expectedMoveStr) {
                return false;
            }

            let move;
            if (typeof moveInput === 'string' && moveInput.length >= 4) {
                const from = moveInput.slice(0, 2);
                const to = moveInput.slice(2, 4);
                const promotion = moveInput.slice(4);

                const piece = gameRef.current.get(from);
                if (!piece) return false;

                const isPawn = piece && piece.type === 'p';
                const isPromotionRank = isPawn && ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

                if (isPawn && isPromotionRank) {
                    move = gameRef.current.move({ from, to, promotion: promotion || 'q' });
                } else {
                    move = gameRef.current.move({ from, to });
                }
            } else {
                move = gameRef.current.move(moveInput);
            }

            if (move) {
                setFen(gameRef.current.fen());
                setMoveIndex(prev => {
                    const nextIdx = prev + 1;
                    if (nextIdx >= movesArr.length) {
                        setIsCompleted(true);
                    }
                    return nextIdx;
                });
                return true;
            }
        } catch (e) {
            console.error('Move error:', e);
        }
        return false;
    }, [currentPuzzle, moveIndex]);

    // Handle puzzle completion
    const handlePuzzleCompletion = useCallback(async () => {
        setIsCompleted(true);
        const stars = Math.max(1, 3 - (hintsUsed * 0.5));
        if (currentPuzzle) {
            try {
                await saveResult(currentPuzzle.PuzzleId, stars);
                const updatedResults = await getAllResults();
                setSolvedResults(updatedResults);
            } catch (err) {
                console.error('Failed to save stars:', err);
            }
        }
    }, [currentPuzzle, hintsUsed]);

    // Handle user move
    const handleUserMove = useCallback((move) => {
        if (isCompleted || feedback || !currentPuzzle) return;

        const movesArr = currentPuzzle.Moves.split(' ');
        const expectedMoveStr = movesArr[moveIndex];
        const userMoveStr = move.from + move.to;

        if (userMoveStr === expectedMoveStr) {
            setHintMove(null);
            const moveResult = gameRef.current.move(move);
            if (!moveResult) return;

            setFen(gameRef.current.fen());
            setFeedback({ type: 'correct', square: move.to });

            setMoveIndex(prevIndex => {
                const nextIdx = prevIndex + 1;
                safeTimeout(() => {
                    setFeedback(null);
                    if (nextIdx >= movesArr.length) {
                        handlePuzzleCompletion();
                    }
                }, 2000);
                return nextIdx;
            });
        } else {
            setFeedback({ type: 'wrong', square: move.to });
            safeTimeout(() => {
                setFen(gameRef.current.fen());
                setFeedback(null);
                setResetCounter(prev => prev + 1);
            }, 2000);
        }
    }, [currentPuzzle, moveIndex, isCompleted, feedback, safeTimeout, handlePuzzleCompletion]);

    // Start puzzle
    const startPuzzle = useCallback((puzzle) => {
        startPuzzleInternal(puzzle);
    }, [startPuzzleInternal]);

    // Handle next puzzle
    const handleNextPuzzle = useCallback(() => {
        const nextIdx = (puzzleIndex + 1) % puzzles.length;
        setPuzzleIndex(nextIdx);
        startPuzzleInternal(puzzles[nextIdx]);
    }, [puzzleIndex, puzzles, startPuzzleInternal]);

    // Handle hint
    const handleHint = useCallback(() => {
        if (!currentPuzzle || isCompleted) return;
        const movesArr = currentPuzzle.Moves.split(' ');
        const expectedMoveStr = movesArr[moveIndex];
        if (expectedMoveStr) {
            setHintMove({
                from: expectedMoveStr.slice(0, 2),
                to: expectedMoveStr.slice(2, 4)
            });
            setHintsUsed(prev => prev + 1);
            safeTimeout(() => setHintMove(null), 2000);
        }
    }, [currentPuzzle, moveIndex, isCompleted, safeTimeout]);

    // Handle auto move
    const handleAutoMove = useCallback(() => {
        if (!currentPuzzle || isCompleted) return;
        const movesArr = currentPuzzle.Moves.split(' ');
        makeMoveInternal(movesArr[moveIndex]);
        setHintsUsed(prev => prev + 1);
        setHintMove(null);
    }, [currentPuzzle, isCompleted, moveIndex, makeMoveInternal]);

    // Handle select puzzle from roadmap
    const handleSelectPuzzle = useCallback((index) => {
        setPuzzleIndex(index);
        startPuzzleInternal(puzzles[index]);
        setIsRoadmapOpen(false);
    }, [puzzles, startPuzzleInternal]);

    return {
        // Data
        puzzles,
        roadmapData,
        solvedResults,

        // Current puzzle
        currentPuzzle,
        puzzleIndex,
        fen,
        feedback,
        isCompleted,
        resetCounter,
        hintsUsed,
        hintMove,

        // UI state
        isRoadmapOpen,
        setIsRoadmapOpen,
        isInstructionsOpen,
        setIsInstructionsOpen,

        // Actions
        handleUserMove,
        handleNextPuzzle,
        handleHint,
        handleAutoMove,
        handleSelectPuzzle,
        startPuzzle,
    };
};

export default usePuzzleMode;
