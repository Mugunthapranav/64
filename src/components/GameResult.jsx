import React from 'react';
import './GameResult.css';

const GameResult = ({ result, playerColor, onNewGame, variant = 'modal' }) => {
    if (!result) return null;

    const { winner, reason } = result;

    const getOutcomeText = () => {
        if (!winner) return 'DRAW';
        return winner === playerColor ? 'YOU WIN' : 'YOU LOSE';
    };

    const getReasonText = () => {
        switch (reason) {
            case 'checkmate': return 'by checkmate';
            case 'stalemate': return 'by stalemate';
            case 'repetition': return 'by threefold repetition';
            case 'insufficient': return 'by insufficient material';
            case 'resign': return winner === playerColor ? 'opponent resigned' : 'you resigned';
            case 'timeout': return 'on time';
            default: return 'game over';
        }
    };

    const outcome = getOutcomeText();
    const outcomeClass = outcome.includes('WIN') ? 'win' : outcome.includes('LOSE') ? 'lose' : 'draw';
    const containerClass = variant === 'modal' ? 'game-result-modal' : 'game-result-sidebar';

    const { moves, hints, material } = result.stats || {};
    const earnedXP = result.earnedXP || 0;
    const materialLead = Math.abs(material || 0);
    const materialText = material === 0 ? 'Equal material' :
        ((material > 0 && playerColor === 'w') || (material < 0 && playerColor === 'b'))
            ? `+${materialLead} material lead`
            : `-${materialLead} material deficit`;

    return (
        <div className={`game-result-container ${containerClass}`}>
            <div className="result-header">
                <div className="result-badge">MATCH OVER</div>
                <div className={`result-title ${outcomeClass}`}>{outcome}</div>
                <div className="result-reason">{getReasonText()}</div>
            </div>

            <div className="result-stats-grid">
                <div className="stat-card xp-card">
                    <span className="stat-label">XP GAINED</span>
                    <span className="stat-value">+{earnedXP}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">HINTS USED</span>
                    <span className="stat-value">{hints}</span>
                </div>
                <div className="stat-card material-card">
                    <span className="stat-label">MATERIAL BALANCE</span>
                    <span className="stat-value">{materialText}</span>
                </div>
            </div>

            <div className="result-actions">
                <button className="btn-new-game-large" onClick={onNewGame}>
                    PLAY AGAIN
                </button>
            </div>
        </div>
    );
};

export default GameResult;
