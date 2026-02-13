import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { loadPuzzles, getGroupedRoadmap } from '../utils/puzzleLoader';
import { saveResult, getAllResults } from '../utils/db';

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

const usePuzzleMode = (addXP) => {
    const [puzzles, setPuzzles] = useState([]);
    const [roadmapData, setRoadmapData] = useState([]);
    const [solvedResults, setSolvedResults] = useState({});

    const [currentPuzzle, setCurrentPuzzle] = useState(null);
    const [puzzleIndex, setPuzzleIndex] = useState(() => {
        const saved = localStorage.getItem('chess-puzzle-index');
        return saved ? parseInt(saved, 10) : 0;
    });

    const [fen, setFen] = useState('start');
    const [moveIndex, setMoveIndex] = useState(0);
    const [feedback, setFeedback] = useState(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [resetCounter, setResetCounter] = useState(0);
    const [earnedXP, setEarnedXP] = useState(null);

    const [hintMove, setHintMove] = useState(null);
    const [hintsUsed, setHintsUsed] = useState(0);

    const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
    const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

    const gameRef = useRef(new Chess());
    const timeoutsRef = useRef([]);
    const xpAwardedRef = useRef(false);

    const safeTimeout = useCallback((callback, delay) => {
        const id = setTimeout(() => {
            callback();
            timeoutsRef.current = timeoutsRef.current.filter(t => t !== id);
        }, delay);
        timeoutsRef.current.push(id);
        return id;
    }, []);

    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach(clearTimeout);
            timeoutsRef.current = [];
        };
    }, []);

    useEffect(() => {
        const initialIndex = puzzleIndex;

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

    useEffect(() => {
        localStorage.setItem('chess-puzzle-index', puzzleIndex.toString());
    }, [puzzleIndex]);

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
        setEarnedXP(null);
        xpAwardedRef.current = false;
        setIsInstructionsOpen(false);
    }, []);

    useEffect(() => {
        if (!currentPuzzle || isCompleted) return;

        const movesArr = currentPuzzle.Moves.split(' ');
        const isOpponentTurn = moveIndex % 2 === 0;

        if (isOpponentTurn && moveIndex < movesArr.length) {
            const timer = safeTimeout(() => {
                if (moveIndex % 2 === 0) {
                    makeMoveInternal(movesArr[moveIndex]);
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [moveIndex, currentPuzzle, isCompleted, safeTimeout]); // eslint-disable-line react-hooks/exhaustive-deps

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
                setMoveIndex(prev => prev + 1);
                return true;
            }
        } catch (e) {
            console.error('Move error:', e);
        }
        return false;
    }, [currentPuzzle, moveIndex]);

    const handlePuzzleCompletion = useCallback(async () => {
        if (xpAwardedRef.current) return;
        xpAwardedRef.current = true;

        setIsCompleted(true);
        const currentStars = Math.max(1, 3 - (hintsUsed * 0.5));

        let xpAmount = 100;
        if (currentStars >= 3) xpAmount = 400;
        else if (currentStars >= 2.5) xpAmount = 300;
        else if (currentStars >= 2) xpAmount = 200;
        else if (currentStars >= 1.5) xpAmount = 150;

        setEarnedXP(xpAmount);

        if (currentPuzzle) {
            try {
                const dbResult = await saveResult(currentPuzzle.PuzzleId, currentStars, xpAmount);
                const prevXP = dbResult.prevXP || 0;

                if (addXP) {
                    addXP(xpAmount - prevXP);
                }

                const updatedResults = await getAllResults();
                setSolvedResults(updatedResults);
            } catch (err) {
                console.error('Failed to save stars:', err);
                if (addXP) addXP(xpAmount);
            }
        }
    }, [currentPuzzle, hintsUsed, addXP]);

    useEffect(() => {
        if (!currentPuzzle || isCompleted || isRoadmapOpen || feedback) return;
        const movesArr = currentPuzzle.Moves.split(' ');
        if (moveIndex >= movesArr.length && movesArr.length > 0) {
            handlePuzzleCompletion();
        }
    }, [moveIndex, currentPuzzle, isCompleted, isRoadmapOpen, feedback, hintsUsed, handlePuzzleCompletion]);

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

    const startPuzzle = useCallback((puzzle) => {
        startPuzzleInternal(puzzle);
    }, [startPuzzleInternal]);

    const handleNextPuzzle = useCallback(() => {
        if (puzzleIndex >= puzzles.length - 1) return;
        const nextIdx = puzzleIndex + 1;
        setPuzzleIndex(nextIdx);
        startPuzzleInternal(puzzles[nextIdx]);
    }, [puzzleIndex, puzzles, startPuzzleInternal]);

    const handlePrevPuzzle = useCallback(() => {
        if (puzzleIndex <= 0) return;
        const prevIdx = puzzleIndex - 1;
        setPuzzleIndex(prevIdx);
        startPuzzleInternal(puzzles[prevIdx]);
    }, [puzzleIndex, puzzles, startPuzzleInternal]);

    const handleReplayPuzzle = useCallback(() => {
        if (!currentPuzzle) return;
        startPuzzleInternal(currentPuzzle);
    }, [currentPuzzle, startPuzzleInternal]);

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

    const handleAutoMove = useCallback(() => {
        if (!currentPuzzle || isCompleted) return;
        const movesArr = currentPuzzle.Moves.split(' ');
        makeMoveInternal(movesArr[moveIndex]);
        setHintsUsed(prev => prev + 1);
        setHintMove(null);
    }, [currentPuzzle, isCompleted, moveIndex, makeMoveInternal]);

    const handleSelectPuzzle = useCallback((index) => {
        setPuzzleIndex(index);
        startPuzzleInternal(puzzles[index]);
        setIsRoadmapOpen(false);
    }, [puzzles, startPuzzleInternal]);

    return {
        puzzles,
        roadmapData,
        solvedResults,

        currentPuzzle,
        puzzleIndex,
        fen,
        feedback,
        isCompleted,
        resetCounter,
        hintsUsed,
        hintMove,
        earnedXP,

        isRoadmapOpen,
        setIsRoadmapOpen,
        isInstructionsOpen,
        setIsInstructionsOpen,

        handleUserMove,
        handleNextPuzzle,
        handlePrevPuzzle,
        handleReplayPuzzle,
        handleHint,
        handleAutoMove,
        handleSelectPuzzle,
        startPuzzle,

        isCurrentPuzzleSolved: currentPuzzle ? !!solvedResults[currentPuzzle.PuzzleId] : false
    };
};

export default usePuzzleMode;
