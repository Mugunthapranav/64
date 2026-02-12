import React, { useEffect, useRef } from 'react';
import './MoveHistorySidebar.css';

const MoveHistorySidebar = ({
    history,
    difficulty,
    onDifficultyChange,
    playerColor,
    onPlayerColorChange,
    onNewGame,
    engineStatus,
    isThinking,
    currentEval,  // Renamed from evaluation - this is the current position eval
    historyEvals = [],
    gameStatus = null,
    onHint,
    topMoves = [],
    onUndo
}) => {
    const scrollRef = useRef(null);
    const [showTopMoves, setShowTopMoves] = React.useState(false);
    const [showDifficulty, setShowDifficulty] = React.useState(false);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    // Flip sign when player is black (evals are from white's perspective by default)
    const flipSign = playerColor === 'b' ? -1 : 1;

    /**
     * Format evaluation for display
     * Converts centipawns to pawns (divide by 100)
     * When player is black, flip the sign so positive = good for player
     */
    const formatEval = (evalObj) => {
        if (!evalObj) return '';

        // Apply perspective flip
        const adjustedValue = evalObj.value * flipSign;

        // Handle mate scores
        if (evalObj.type === 'mate') {
            const mateIn = adjustedValue;
            return mateIn > 0 ? `M${Math.abs(mateIn)}` : `M${mateIn}`;
        }

        // Convert centipawns to pawns (divide by 100)
        const pawns = adjustedValue / 100;
        const formatted = Math.abs(pawns) >= 10
            ? pawns.toFixed(1)  // Large values: 1 decimal
            : pawns.toFixed(2); // Small values: 2 decimals

        return pawns > 0 ? `+${formatted}` : formatted;
    };

    /**
     * Get CSS class for evaluation styling
     * Positive = player advantage, Negative = opponent advantage
     */
    const getEvalClass = (evalObj) => {
        if (!evalObj || evalObj.value === 0) return 'neutral';
        const adjustedValue = evalObj.value * flipSign;
        return adjustedValue > 0 ? 'pos' : 'neg';
    };

    // Build move pairs for display
    const pairs = [];
    for (let i = 0; i < history.length; i += 2) {
        pairs.push({
            number: Math.floor(i / 2) + 1,
            white: history[i],
            black: history[i + 1] || null,
            whiteEval: historyEvals[i] || null,
            blackEval: historyEvals[i + 1] || null
        });
    }

    // Format current evaluation for display (with perspective flip applied)
    const currentEvalFormatted = formatEval(currentEval);
    const currentAdjustedValue = (currentEval?.value || 0) * flipSign;
    const isPlayerAdv = currentAdjustedValue > 0 || (currentEval?.type === 'mate' && currentAdjustedValue > 0);

    return (
        <div className="engine-sidebar">
            <header className="sidebar-header">
                <div className="sidebar-top-row">
                    <span className="sidebar-title">Engine Analysis</span>
                    <div className="sidebar-header-actions">

                        <div className={`engine-status-badge ${engineStatus === 'Ready' ? 'Ready' : ''}`}>
                            {engineStatus}
                        </div>
                    </div>
                </div>

                <div className={`difficulty-controls ${showDifficulty ? 'show-mobile' : ''}`}>
                    <div className="difficulty-info">
                        <label>Level</label>
                        <span>{difficulty}</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={difficulty}
                        onChange={(e) => onDifficultyChange(parseInt(e.target.value))}
                        className="difficulty-slider"
                    />

                    <div className="player-color-toggle">
                        <label className="toggle-label">
                            <span className="toggle-text">Play as Black</span>
                            <div
                                className={`custom-toggle ${playerColor === 'b' ? 'active' : ''}`}
                                onClick={() => onPlayerColorChange(playerColor === 'w' ? 'b' : 'w')}
                            >
                                <div className="toggle-handle"></div>
                            </div>
                        </label>
                    </div>
                </div>
            </header>

            <div className="sidebar-content" ref={scrollRef}>
                <div className="moves-list">
                    {pairs.map((pair, idx) => (
                        <div key={idx} className="move-row">
                            <span className="move-number">{pair.number}.</span>
                            <div className="move-pair">
                                <div className="move-item">
                                    <span className="san-text">{pair.white}</span>
                                    {pair.whiteEval && pair.whiteEval.value !== 0 && (
                                        <span className={`eval-text ${getEvalClass(pair.whiteEval)}`}>
                                            {formatEval(pair.whiteEval)}
                                        </span>
                                    )}
                                </div>
                                {pair.black && (
                                    <div className="move-item">
                                        <span className="san-text">{pair.black}</span>
                                        {pair.blackEval && pair.blackEval.value !== 0 && (
                                            <span className={`eval-text ${getEvalClass(pair.blackEval)}`}>
                                                {formatEval(pair.blackEval)}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <footer className="sidebar-footer">
                {isThinking && (
                    <div className="engine-thinking">
                        Engine is thinking...
                    </div>
                )}
                <div className="eval-bar-summary">
                    <span className="eval-label">
                        {gameStatus || 'Current Eval'}
                    </span>
                    <span className={`eval-value ${isPlayerAdv ? 'pos' : 'neg'}`}>
                        {!gameStatus && currentEvalFormatted}
                    </span>
                </div>

                <div className="top-moves-toggle-container">
                    <label className="toggle-label">
                        <span className="toggle-text">Show Top Moves</span>
                        <div className={`custom-toggle ${showTopMoves ? 'active' : ''}`} onClick={() => setShowTopMoves(!showTopMoves)}>
                            <div className="toggle-handle"></div>
                        </div>
                    </label>
                </div>

                {showTopMoves && topMoves.length > 0 && (
                    <div className="top-moves-list">
                        {topMoves.slice(0, 3).map((m, i) => {
                            const scoreDisplay = m.scoreType === 'mate'
                                ? `M${m.score}`
                                : `${m.score > 0 ? '+' : ''}${(m.score / 100).toFixed(2)}`;
                            return (
                                <div key={i} className="top-move-item">
                                    <span className="top-move-text">
                                        {i + 1}. {m.move} <span className={`top-move-eval ${m.score >= 0 ? 'pos' : 'neg'}`}>({scoreDisplay})</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="sidebar-actions">
                    <button
                        className={`difficulty-toggle-btn ${showDifficulty ? 'active' : ''}`}
                        onClick={() => setShowDifficulty(!showDifficulty)}
                        title="Toggle Difficulty Controls"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="2" y1="14" x2="6" y2="14" /><line x1="10" y1="8" x2="14" y2="8" /><line x1="18" y1="16" x2="22" y2="16" />
                        </svg>
                    </button>
                    <button className="undo-btn" onClick={onUndo} disabled={history.length === 0}>
                        Undo
                    </button>
                    <button className="hint-btn-main" onClick={onHint}>
                        Hint
                    </button>
                    <button className="new-game-btn" onClick={onNewGame}>
                        New Game
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default MoveHistorySidebar;
