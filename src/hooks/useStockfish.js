import { useState, useEffect, useCallback, useRef } from 'react';

const useStockfish = (instanceName = 'Stockfish') => {
    const workerRef = useRef(null);
    const [isThinking, setIsThinking] = useState(false);
    const [engineStatus, setEngineStatus] = useState('offline');
    const [engineError, setEngineError] = useState(null);
    const [evaluation, setEvaluation] = useState({ type: 'cp', value: 0, turn: 'w', fen: '', positionKey: '' });
    const lastUpdateRef = useRef(0);
    const lastValueRef = useRef(0);

    useEffect(() => {
        console.log(`${instanceName}: Initializing worker...`);

        try {
            const worker = new Worker('/stockfish/stockfish.js');
            workerRef.current = worker;

            let currentTurn = 'w';
            let currentFen = '';
            let currentPositionKey = '';

            worker.onmessage = (e) => {
                const line = e.data;
                if (line === 'uciok' || line === 'readyok') {
                    setEngineStatus('ready');
                    setEngineError(null);
                    console.log(`${instanceName}: Engine ready`);
                }

                // Parse evaluation with FEN/turn/positionKey context
                if (line.includes('info') && line.includes('score')) {
                    const parts = line.split(' ');
                    const scoreIndex = parts.indexOf('score');
                    if (scoreIndex !== -1) {
                        const type = parts[scoreIndex + 1];
                        const value = parseInt(parts[scoreIndex + 2], 10);

                        const now = Date.now();
                        const valueChanged = value !== lastValueRef.current;
                        const isSignificant = Math.abs(value - lastValueRef.current) > (instanceName === 'Analysis' ? 2 : 5);
                        const timePassed = now - lastUpdateRef.current > (instanceName === 'Analysis' ? 150 : 300);

                        // Throttle updates: only re-render if value changed significantly or enough time passed
                        if (valueChanged && (isSignificant || timePassed)) {
                            lastUpdateRef.current = now;
                            lastValueRef.current = value;
                            setEvaluation({
                                type,
                                value,
                                turn: currentTurn,
                                fen: currentFen,
                                positionKey: currentPositionKey
                            });
                        }
                    }
                }
            };

            worker.onerror = (error) => {
                console.error(`${instanceName}: Worker error:`, error);
                setEngineStatus('error');
                setEngineError(error.message || 'Worker failed to initialize');
            };

            const originalPostMessage = worker.postMessage.bind(worker);
            worker.postMessage = (msg) => {
                if (typeof msg === 'string' && msg.startsWith('position')) {
                    const fenParts = msg.split(' ');
                    if (msg.includes('fen')) {
                        const fenIndex = fenParts.indexOf('fen');
                        // Capture first 4 fields (board, turn, castling, en passant) for robust matching
                        currentFen = fenParts.slice(fenIndex + 1, fenIndex + 7).join(' ');
                        currentPositionKey = fenParts.slice(fenIndex + 1, fenIndex + 5).join(' ');
                        currentTurn = fenParts[fenIndex + 2];
                    } else if (msg.includes('startpos')) {
                        currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                        currentPositionKey = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
                        currentTurn = 'w';
                    }
                }
                originalPostMessage(msg);
            };

            worker.postMessage('uci');
            worker.postMessage('isready');
            worker.postMessage('setoption name Threads value 4');
        } catch (error) {
            console.error(`${instanceName}: Failed to create worker:`, error);
            setEngineStatus('error');
            setEngineError(error.message || 'Failed to initialize Stockfish engine');
        }

        return () => {
            if (workerRef.current) {
                console.log(`${instanceName}: Terminating worker`);
                workerRef.current.terminate();
            }
        };
    }, [instanceName]);

    const setDifficulty = useCallback((level) => {
        if (!workerRef.current) return;

        if (level === null) {
            // Maximum Strength (No constraints)
            workerRef.current.postMessage(`setoption name UCI_LimitStrength value false`);
            workerRef.current.postMessage(`setoption name Skill Level value 20`);
            return;
        }

        const skill = Math.round((level / 10) * 20);
        const elo = 1350 + (level * 150);
        workerRef.current.postMessage(`setoption name Skill Level value ${skill}`);
        workerRef.current.postMessage(`setoption name UCI_LimitStrength value true`);
        workerRef.current.postMessage(`setoption name UCI_Elo value ${elo}`);
        console.log(`${instanceName}: Difficulty set to ${level} (Skill: ${skill}, Elo: ${elo})`);
    }, [instanceName]);

    const stopThinking = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.postMessage('stop');
            setIsThinking(false);
        }
    }, []);

    const getBestMove = useCallback((fen, difficulty = 5, depthOverride = null) => {
        return new Promise((resolve) => {
            if (!workerRef.current) return resolve(null);

            stopThinking(); // Stop any background analysis
            setIsThinking(true);

            const worker = workerRef.current;
            setDifficulty(difficulty);

            // Logic for depth: 
            // - If depthOverride is provided, use it (typically for hints).
            // - Otherwise, map difficulty to depth (Level 0 -> 1, Level 10 -> 20)
            const depth = depthOverride || (difficulty === 0 ? 1 : (difficulty * 2));

            const onMessage = (e) => {
                const line = e.data;
                if (line.startsWith('bestmove')) {
                    const move = line.split(' ')[1];
                    setIsThinking(false);
                    worker.removeEventListener('message', onMessage);
                    resolve(move);
                }
            };

            worker.addEventListener('message', onMessage);
            worker.postMessage(`position fen ${fen}`);
            worker.postMessage(`go depth ${depth}`);
        });
    }, [setDifficulty, stopThinking]);

    /**
     * Get top N best moves using MultiPV
     * @param {string} fen - Position to analyze
     * @param {number} numMoves - Number of moves to get (default 3)
     * @param {number} depth - Search depth (default 12)
     * @returns {Promise<Array<{move: string, score: number, scoreType: string}>>}
     */
    const getTopMoves = useCallback((fen, numMoves = 3, depth = 12) => {
        return new Promise((resolve) => {
            if (!workerRef.current) return resolve([]);

            stopThinking();
            setIsThinking(true);

            const worker = workerRef.current;

            // Set max strength for accurate analysis
            setDifficulty(null);

            // Enable MultiPV to get multiple lines
            worker.postMessage(`setoption name MultiPV value ${numMoves}`);

            const moves = new Map(); // Use Map to track best score per PV line
            let finalDepthReached = 0;

            const onMessage = (e) => {
                const line = e.data;

                // Parse info lines to extract PV moves and scores
                if (line.includes('info') && line.includes('score') && line.includes(' pv ')) {
                    const parts = line.split(' ');

                    // Get depth
                    const depthIndex = parts.indexOf('depth');
                    const currentDepth = depthIndex !== -1 ? parseInt(parts[depthIndex + 1], 10) : 0;

                    // Get multipv line number
                    const multipvIndex = parts.indexOf('multipv');
                    const pvLine = multipvIndex !== -1 ? parseInt(parts[multipvIndex + 1], 10) : 1;

                    // Get score
                    const scoreIndex = parts.indexOf('score');
                    const scoreType = parts[scoreIndex + 1]; // 'cp' or 'mate'
                    const scoreValue = parseInt(parts[scoreIndex + 2], 10);

                    // Get first move in pv
                    const pvIndex = parts.indexOf('pv');
                    const move = pvIndex !== -1 ? parts[pvIndex + 1] : null;

                    if (move && currentDepth >= finalDepthReached) {
                        finalDepthReached = currentDepth;
                        moves.set(pvLine, {
                            move,
                            score: scoreValue,
                            scoreType,
                            depth: currentDepth
                        });
                    }
                }

                if (line.startsWith('bestmove')) {
                    setIsThinking(false);
                    worker.removeEventListener('message', onMessage);

                    // Reset MultiPV to 1 for normal operation
                    worker.postMessage('setoption name MultiPV value 1');

                    // Convert Map to sorted array
                    const result = Array.from(moves.values())
                        .sort((a, b) => b.score - a.score) // Higher score = better for side to move
                        .slice(0, numMoves);

                    resolve(result);
                }
            };

            worker.addEventListener('message', onMessage);
            worker.postMessage(`position fen ${fen}`);
            worker.postMessage(`go depth ${depth}`);
        });
    }, [setDifficulty, stopThinking]);

    const startAnalysis = useCallback((fen, depth = 12) => {
        if (!workerRef.current) return;

        stopThinking(); // Stop previous analysis immediately

        // Ensure analysis is always at max strength
        setDifficulty(null);

        // Proactively set the position metadata so the UI knows which move we are analyzing
        // This prevents the "reset" from overwriting previous move evals in history.
        const fenParts = fen.split(' ');
        const newKey = fenParts.slice(0, 4).join(' '); // board, turn, castling, ep
        const newTurn = fenParts[1];

        setEvaluation({
            type: 'cp',
            value: 0,
            turn: newTurn,
            fen: fen,
            positionKey: newKey
        });

        workerRef.current.postMessage(`position fen ${fen}`);
        // Fast-Sync: Get an instant baseline score at low depth
        workerRef.current.postMessage(`go depth 1`);
        // Then start deeper analysis
        workerRef.current.postMessage(`go depth ${depth}`);
    }, [setDifficulty, stopThinking]);

    return { getBestMove, getTopMoves, startAnalysis, stopThinking, isThinking, engineStatus, engineError, evaluation };
};

export default useStockfish;
