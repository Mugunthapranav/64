import React from 'react';
import './PuzzleControls.css';

const PuzzleControls = ({
    onHint,
    onAutoMove,
    onToggleInstructions,
    showGoal,
    isCompleted
}) => {
    // Hidden when completed because PuzzleSolved takes over
    if (isCompleted) return null;

    return (
        <div className="puzzle-controls">
            <div className="controls-actions">
                {showGoal && (
                    <button className="action-btn goal-btn" onClick={onToggleInstructions}>
                        About
                    </button>
                )}
                <button className="action-btn hint-btn" onClick={onHint}>
                    Hint
                </button>
                <button className="action-btn move-btn" onClick={onAutoMove}>
                    Move
                </button>
            </div>
        </div>
    );
};

export default PuzzleControls;
