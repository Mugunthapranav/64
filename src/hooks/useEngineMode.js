import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import useStockfish from './useStockfish';

const getPositionKey = (fen) => {
    if (!fen || fen === 'start') return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
    return fen.split(' ').slice(0, 4).join(' ');
};

const useEngineMode = (addXP) => {
    const [isEngineMode, setIsEngineMode] = useState(false);
    const [engineGame, setEngineGame] = useState(new Chess());
    const [engineHistory, setEngineHistory] = useState([]);
    const [engineHistoryEvals, setEngineHistoryEvals] = useState([]);
    const [difficulty, setDifficulty] = useState(5);
    const [playerColor, setPlayerColor] = useState('w');
    const [hintMove, setHintMove] = useState(null);
    const [topMoves, setTopMoves] = useState([]);
    const [lastMoveQuality, setLastMoveQuality] = useState(null);
    const [gameResult, setGameResult] = useState(null);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [matchXP, setMatchXP] = useState(0);
    const [isGameActive, setIsGameActive] = useState(false);

    const [currentEval, setCurrentEval] = useState({ type: 'cp', value: 0, turn: 'w' });

    const timeoutsRef = useRef([]);

    const isAnalyzingRef = useRef(false);

    const safeTimeout = useCallback((callback, delay) => {
        const id = setTimeout(() => {
            callback();
            timeoutsRef.current = timeoutsRef.current.filter(t => t !== id);
        }, delay);
        timeoutsRef.current.push(id);
        return id;
    }, []);

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

    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach(clearTimeout);
            timeoutsRef.current = [];
        };
    }, []);

    useEffect(() => {
        if (!isEngineMode || !evaluation || !evaluation.positionKey) return;

        const normalizedValue = evaluation.turn === 'w' ? evaluation.value : -evaluation.value;

        const currentPosKey = getPositionKey(engineGame.fen());
        if (evaluation.positionKey === currentPosKey) {
            setCurrentEval({
                type: evaluation.type,
                value: normalizedValue,
                turn: evaluation.turn
            });
        }

        setEngineHistoryEvals(prev => {
            const evalMoveIndex = prev.findIndex(item => item.positionKey === evaluation.positionKey);

            if (evalMoveIndex !== -1) {
                if (evaluation.value === 0 && evaluation.type !== 'mate' && prev[evalMoveIndex].value !== 0) {
                    return prev;
                }

                const next = [...prev];
                next[evalMoveIndex] = {
                    ...evaluation,
                    value: normalizedValue,
                    normalized: true
                };
                return next;
            }
            return prev;
        });
    }, [evaluation, isEngineMode, engineGame]);

    useEffect(() => {
        if (isEngineMode && engineGame && !engineGame.isGameOver()) {
            startAnalysis(engineGame.fen());
        } else {
            stopAnalysis();
        }
    }, [engineGame, isEngineMode, startAnalysis, stopAnalysis]);

    useEffect(() => {
        if (!isEngineMode || !engineGame || engineGame.isGameOver()) return;

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
    }, [engineGame, isEngineMode, getTopMoves, playerColor, gameResult]);

    useEffect(() => {
        if (!isEngineMode || !engineGame || gameResult) return;

        if (engineGame.isGameOver()) {
            let winner = null;
            let reason = 'draw';

            if (engineGame.isCheckmate()) {
                winner = engineGame.turn() === 'w' ? 'b' : 'w';
                reason = 'checkmate';
            } else if (engineGame.isStalemate()) {
                reason = 'stalemate';
            } else if (engineGame.isThreefoldRepetition()) {
                reason = 'repetition';
            } else if (engineGame.isInsufficientMaterial()) {
                reason = 'insufficient';
            } else if (engineGame.isDraw()) {
                reason = 'draw';
            }

            const resultXP = winner === playerColor ? 500 : 300;
            const totalEarned = matchXP + resultXP;
            if (addXP) addXP(resultXP);

            setGameResult({
                winner,
                reason,
                earnedXP: totalEarned,
                stats: {
                    moves: Math.ceil(engineGame.history().length / 2),
                    hints: hintsUsed,
                    material: calculateMaterialBalance(engineGame)
                }
            });
        }
    }, [engineGame, isEngineMode, gameResult, hintsUsed, matchXP, addXP, playerColor]);

    const calculateMaterialBalance = (game) => {
        const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        let balance = 0;
        game.board().forEach(row => {
            row.forEach(piece => {
                if (piece) {
                    const val = values[piece.type];
                    balance += piece.color === 'w' ? val : -val;
                }
            });
        });
        return balance;
    };

    const handleEngineMove = useCallback(async (move) => {
        if (engineGame.isGameOver()) return false;

        try {
            const preFen = engineGame.fen();
            const prePosKey = getPositionKey(preFen);

            const result = engineGame.move(move);
            if (result) {
                if (!isGameActive) setIsGameActive(true);
                if (result.color === playerColor && topMoves.length > 0) {
                    const uciMove = result.from + result.to + (result.promotion || '');
                    const matchingTopMoveIndex = topMoves.findIndex(m => m.move === uciMove);

                    let quality = 'mistake';
                    let moveXP = 0;
                    if (matchingTopMoveIndex === 0) {
                        quality = 'best-1st';
                        moveXP = 30;
                    } else if (matchingTopMoveIndex === 1) {
                        quality = 'best-2nd';
                        moveXP = 20;
                    } else if (matchingTopMoveIndex === 2) {
                        quality = 'best-3rd';
                        moveXP = 10;
                    }

                    if (moveXP > 0) {
                        setMatchXP(prev => prev + moveXP);
                        if (addXP) addXP(moveXP);
                    }

                    setLastMoveQuality({
                        square: result.to,
                        type: quality
                    });
                    safeTimeout(() => setLastMoveQuality(null), 2000);
                }

                const userMoveSan = result.san;
                const postFen = engineGame.fen();
                const postPosKey = getPositionKey(postFen);


                setEngineHistory(prev => [...prev, userMoveSan]);
                setEngineHistoryEvals(prev => [...prev, {
                    type: 'cp',
                    value: 0,
                    positionKey: postPosKey,
                    turn: postFen.split(' ')[1],
                    normalized: false
                }]);

                const updatedGame = new Chess(postFen);
                setEngineGame(updatedGame);


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
    }, [engineGame, difficulty, getBestMove, safeTimeout, topMoves, playerColor, gameResult]);

    const handleResign = useCallback(() => {
        if (!isEngineMode || engineGame.isGameOver() || gameResult) return;

        const winner = playerColor === 'w' ? 'b' : 'w';
        setGameResult({
            winner,
            reason: 'resign',
            stats: {
                moves: Math.ceil(engineGame.history().length / 2),
                hints: hintsUsed,
                material: calculateMaterialBalance(engineGame)
            }
        });

        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
    }, [isEngineMode, engineGame, gameResult, playerColor]);

    const handleToggleEngineMode = useCallback(() => {
        setIsEngineMode(prev => {
            if (!prev) {
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

    useEffect(() => {
        if (!isEngineMode || !isGameActive) return;
        if (playerColor !== 'b') return;
        if (engineHistory.length > 0) return;
        if (engineGame.isGameOver()) return;
        if (engineGame.turn() !== 'w') return;

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
    }, [isEngineMode, playerColor, engineHistory.length, engineGame, getBestMove, difficulty, safeTimeout, isGameActive]);

    const handleNewEngineGame = useCallback(() => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];

        setEngineGame(new Chess());
        setEngineHistory([]);
        setEngineHistoryEvals([]);
        setCurrentEval({ type: 'cp', value: 0, turn: 'w' });
        setHintMove(null);
        setTopMoves([]);
        setLastMoveQuality(null);
        setGameResult(null);
        setHintsUsed(0);
        setMatchXP(0);
        setIsGameActive(false);
    }, []);

    const handleStartGame = useCallback(() => {
        setIsGameActive(true);
    }, []);

    const handleEngineHint = useCallback(async () => {
        if (hintMove) {
            setHintMove(null);
            return;
        }

        if (engineGame.isGameOver()) return;

        const bestMove = await getHintBestMove(engineGame.fen(), null, 14);
        if (bestMove && bestMove !== '(none)' && bestMove.length >= 4) {
            setHintsUsed(prev => prev + 1);
            setHintMove({
                from: bestMove.slice(0, 2),
                to: bestMove.slice(2, 4)
            });
            safeTimeout(() => setHintMove(null), 5000);
        }
    }, [engineGame, hintMove, getHintBestMove, safeTimeout]);

    const handleUndoMove = useCallback(() => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];

        if (engineHistory.length === 0) return;

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

    const getGameStatus = useCallback(() => {
        if (engineGame.isCheckmate()) return 'Checkmate';
        if (engineGame.isDraw()) return 'Draw';
        if (engineGame.isGameOver()) return 'Game Over';
        return null;
    }, [engineGame]);

    return {
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
        gameResult,

        isThinking,
        isHintThinking,
        engineStatus,

        currentEval,

        gameStatus: getGameStatus(),

        handleEngineMove,
        handleToggleEngineMode,
        handleNewEngineGame,
        handleEngineHint,
        handleUndoMove,
        handleResign,
        handleStartGame,
        isGameActive,
    };
};

export default useEngineMode;
