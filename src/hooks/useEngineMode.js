import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import useStockfish from './useStockfish';

/**
 * Utility to get 4-field position key (board, turn, castling, ep)
 */
const getPositionKey = (fen) => {
    if (!fen || fen === 'start') return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
    return fen.split(' ').slice(0, 4).join(' ');
};

/**
 * Custom hook for engine mode state and logic
 */
const useEngineMode = () => {
    // Engine mode state
    const [isEngineMode, setIsEngineMode] = useState(false);
    const [engineGame, setEngineGame] = useState(new Chess());
    const [engineHistory, setEngineHistory] = useState([]);
    const [engineHistoryEvals, setEngineHistoryEvals] = useState([]);
    const [difficulty, setDifficulty] = useState(5);
    const [playerColor, setPlayerColor] = useState('w'); // 'w' = white, 'b' = black
    const [hintMove, setHintMove] = useState(null);
    const [topMoves, setTopMoves] = useState([]);
    const [lastMoveQuality, setLastMoveQuality] = useState(null); // { square, type }

    // Current position evaluation (for display bar)
    const [currentEval, setCurrentEval] = useState({ type: 'cp', value: 0, turn: 'w' });

    // Timeout tracking for cleanup
    const timeoutsRef = useRef([]);

    // Analysis queue - positions waiting for evaluation
    const analysisQueueRef = useRef([]);
    const isAnalyzingRef = useRef(false);

    // Safe timeout wrapper
    const safeTimeout = useCallback((callback, delay) => {
        const id = setTimeout(() => {
            callback();
            timeoutsRef.current = timeoutsRef.current.filter(t => t !== id);
        }, delay);
        timeoutsRef.current.push(id);
        return id;
    }, []);

    // Stockfish instances
    const { getBestMove, isThinking, engineStatus } = useStockfish('Opponent');
    const {
        startAnalysis,
        stopThinking: stopAnalysis,
        evaluation,
        engineStatus: analysisStatus
    } = useStockfish('Analysis');
    const {
        getBestMove: getHintBestMove,
        getTopMoves,
        isThinking: isHintThinking
    } = useStockfish('Hint');

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach(clearTimeout);
            timeoutsRef.current = [];
        };
    }, []);

    // Process evaluation updates from the Analysis engine
    useEffect(() => {
        if (!isEngineMode || !evaluation || !evaluation.positionKey) return;

        // Normalize: UCI score is from side-to-move perspective
        // We want: Positive = White advantage, Negative = Black advantage
        const normalizedValue = evaluation.turn === 'w' ? evaluation.value : -evaluation.value;

        // Update current evaluation display (always shows current position)
        const currentPosKey = getPositionKey(engineGame.fen());
        if (evaluation.positionKey === currentPosKey) {
            setCurrentEval({
                type: evaluation.type,
                value: normalizedValue,
                turn: evaluation.turn
            });
        }

        // Update history evals if we have a matching position
        setEngineHistoryEvals(prev => {
            const evalMoveIndex = prev.findIndex(item => item.positionKey === evaluation.positionKey);

            if (evalMoveIndex !== -1) {
                // Don't overwrite with 0 baseline if we already have a real value
                if (evaluation.value === 0 && evaluation.type !== 'mate' && prev[evalMoveIndex].value !== 0) {
                    return prev;
                }

                const next = [...prev];
                next[evalMoveIndex] = {
                    ...evaluation,
                    value: normalizedValue,
                    normalized: true  // Mark as properly normalized
                };
                return next;
            }
            return prev;
        });
    }, [evaluation, isEngineMode, engineGame]);

    // Run analysis when board changes in engine mode
    useEffect(() => {
        if (isEngineMode && engineGame && !engineGame.isGameOver()) {
            startAnalysis(engineGame.fen());
        } else {
            stopAnalysis();
        }
    }, [engineGame, isEngineMode, startAnalysis, stopAnalysis]);

    // Fetch top 3 moves when it's user's turn
    useEffect(() => {
        if (!isEngineMode || !engineGame || engineGame.isGameOver()) return;

        // Only fetch when it's the player's turn
        if (engineGame.turn() !== playerColor) return;

        const fetchTopMoves = async () => {
            const fen = engineGame.fen();
            console.log('[Top Moves] Fetching top 3 moves for position...');

            const topMoves = await getTopMoves(fen, 3, 14);

            if (topMoves.length > 0) {
                setTopMoves(topMoves);
                console.log('[Top Moves] Top 3 recommended moves:');
                topMoves.forEach((m, i) => {
                    const scoreDisplay = m.scoreType === 'mate'
                        ? `Mate in ${m.score}`
                        : `${(m.score / 100).toFixed(2)} pawns`;
                    console.log(`  ${i + 1}. ${m.move} (${scoreDisplay})`);
                });
            } else {
                setTopMoves([]);
            }
        };

        fetchTopMoves();
    }, [engineGame, isEngineMode, getTopMoves, playerColor]);

    // Handle engine move
    const handleEngineMove = useCallback(async (move) => {
        if (engineGame.isGameOver()) return false;

        try {
            // Capture FEN BEFORE the move to associate eval with the move
            const preFen = engineGame.fen();
            const prePosKey = getPositionKey(preFen);

            const result = engineGame.move(move);
            if (result) {
                // Determine move quality (only for user moves)
                if (result.color === playerColor && topMoves.length > 0) {
                    const uciMove = result.from + result.to + (result.promotion || '');
                    const matchingTopMoveIndex = topMoves.findIndex(m => m.move === uciMove);

                    let quality = 'mistake';
                    if (matchingTopMoveIndex === 0) quality = 'best-1st';
                    else if (matchingTopMoveIndex === 1) quality = 'best-2nd';
                    else if (matchingTopMoveIndex === 2) quality = 'best-3rd';

                    setLastMoveQuality({
                        square: result.to,
                        type: quality
                    });
                    safeTimeout(() => setLastMoveQuality(null), 2000);
                }

                const userMoveSan = result.san;
                const postFen = engineGame.fen();
                const postPosKey = getPositionKey(postFen);

                // Store the move with the POST-move position key
                // (because we want to show the eval of the resulting position)
                setEngineHistory(prev => [...prev, userMoveSan]);
                setEngineHistoryEvals(prev => [...prev, {
                    type: 'cp',
                    value: 0,
                    positionKey: postPosKey,
                    turn: postFen.split(' ')[1],  // Turn in resulting position
                    normalized: false
                }]);

                const updatedGame = new Chess(postFen);
                setEngineGame(updatedGame);

                // Schedule Engine Response (engine plays as the opposite of player's color)
                const engineColor = playerColor === 'w' ? 'b' : 'w';
                if (!updatedGame.isGameOver() && updatedGame.turn() === engineColor) {
                    safeTimeout(async () => {
                        const bestMove = await getBestMove(updatedGame.fen(), difficulty);

                        if (bestMove && bestMove !== '(none)' && bestMove.length >= 4) {
                            const enginePreFen = updatedGame.fen();

                            const engineMoveResult = updatedGame.move({
                                from: bestMove.slice(0, 2),
                                to: bestMove.slice(2, 4),
                                promotion: bestMove.slice(4) || 'q'
                            });

                            if (engineMoveResult) {
                                const engineMoveSan = engineMoveResult.san;
                                const enginePostFen = updatedGame.fen();
                                const enginePostPosKey = getPositionKey(enginePostFen);

                                setEngineHistory(prev => [...prev, engineMoveSan]);
                                setEngineHistoryEvals(prev => [...prev, {
                                    type: 'cp',
                                    value: 0,
                                    positionKey: enginePostPosKey,
                                    turn: enginePostFen.split(' ')[1],
                                    normalized: false
                                }]);

                                setEngineGame(new Chess(enginePostFen));
                            }
                        }
                    }, 3000);
                }
                return true;
            }
        } catch (e) {
            console.error('Engine move error:', e);
        }
        return false;
    }, [engineGame, difficulty, getBestMove, safeTimeout, topMoves, playerColor]);

    // Toggle engine mode
    const handleToggleEngineMode = useCallback(() => {
        setIsEngineMode(prev => {
            if (!prev) {
                // Entering engine mode
                setEngineGame(new Chess());
                setEngineHistory([]);
                setEngineHistoryEvals([]);
                setCurrentEval({ type: 'cp', value: 0, turn: 'w' });
                setTopMoves([]);
                setLastMoveQuality(null);
            }
            return !prev;
        });
    }, []);

    // Effect to make engine move first when player is black
    useEffect(() => {
        if (!isEngineMode) return;
        if (playerColor !== 'b') return;
        if (engineHistory.length > 0) return; // Only on fresh game
        if (engineGame.isGameOver()) return;
        if (engineGame.turn() !== 'w') return; // Engine plays white, should move first

        // Delay to let the UI settle
        const timeoutId = safeTimeout(async () => {
            const bestMove = await getBestMove(engineGame.fen(), difficulty);

            if (bestMove && bestMove !== '(none)' && bestMove.length >= 4) {
                const moveResult = engineGame.move({
                    from: bestMove.slice(0, 2),
                    to: bestMove.slice(2, 4),
                    promotion: bestMove.slice(4) || 'q'
                });

                if (moveResult) {
                    const moveSan = moveResult.san;
                    const postFen = engineGame.fen();
                    const postPosKey = getPositionKey(postFen);

                    setEngineHistory([moveSan]);
                    setEngineHistoryEvals([{
                        type: 'cp',
                        value: 0,
                        positionKey: postPosKey,
                        turn: postFen.split(' ')[1],
                        normalized: false
                    }]);

                    setEngineGame(new Chess(postFen));
                }
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [isEngineMode, playerColor, engineHistory.length, engineGame, getBestMove, difficulty, safeTimeout]);

    // Start new engine game
    const handleNewEngineGame = useCallback(() => {
        // Clear pending timeouts
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];

        setEngineGame(new Chess());
        setEngineHistory([]);
        setEngineHistoryEvals([]);
        setCurrentEval({ type: 'cp', value: 0, turn: 'w' });
        setHintMove(null);
        setTopMoves([]);
        setLastMoveQuality(null);
    }, []);

    // Handle hint in engine mode
    const handleEngineHint = useCallback(async () => {
        if (hintMove) {
            setHintMove(null);
            return;
        }

        if (engineGame.isGameOver()) return;

        // Use null for difficulty to get max strength, and depth 14 for speed
        const bestMove = await getHintBestMove(engineGame.fen(), null, 14);
        if (bestMove && bestMove !== '(none)' && bestMove.length >= 4) {
            setHintMove({
                from: bestMove.slice(0, 2),
                to: bestMove.slice(2, 4)
            });
            safeTimeout(() => setHintMove(null), 5000);
        }
    }, [engineGame, hintMove, getHintBestMove, safeTimeout]);

    // Handle undo move
    const handleUndoMove = useCallback(() => {
        // Clear all pending timeouts (especially engine moves)
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];

        if (engineHistory.length === 0) return;

        // If it's engine's turn, it means user JUST moved. Revert 1.
        // If it's user's turn, it means engine just moved. Revert 2.
        const engineColor = playerColor === 'w' ? 'b' : 'w';
        const movesToUndo = engineGame.turn() === engineColor ? 1 : 2;
        const actualUndoCount = Math.min(movesToUndo, engineHistory.length);

        setEngineHistory(prev => prev.slice(0, prev.length - actualUndoCount));
        setEngineHistoryEvals(prev => prev.slice(0, prev.length - actualUndoCount));

        const newGame = new Chess();
        const historyAfterUndo = engineHistory.slice(0, engineHistory.length - actualUndoCount);
        historyAfterUndo.forEach(move => newGame.move(move));

        setEngineGame(newGame);
        setLastMoveQuality(null);
        setHintMove(null);
    }, [engineGame, engineHistory, safeTimeout]);

    // Get game status
    const getGameStatus = useCallback(() => {
        if (engineGame.isCheckmate()) return 'Checkmate';
        if (engineGame.isDraw()) return 'Draw';
        if (engineGame.isGameOver()) return 'Game Over';
        return null;
    }, [engineGame]);

    return {
        // State
        isEngineMode,
        engineGame,
        engineHistory,
        engineHistoryEvals,
        difficulty,
        setDifficulty,
        playerColor,
        setPlayerColor,
        hintMove,
        topMoves,
        lastMoveQuality,

        // Stockfish status
        isThinking,
        isHintThinking,
        engineStatus,

        // Current position evaluation (normalized: + = white advantage)
        currentEval,

        // Computed
        gameStatus: getGameStatus(),

        // Actions
        handleEngineMove,
        handleToggleEngineMode,
        handleNewEngineGame,
        handleEngineHint,
        handleUndoMove,
    };
};

export default useEngineMode;
