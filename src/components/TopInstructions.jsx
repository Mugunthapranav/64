import React from 'react';
import './TopInstructions.css';

const TopInstructions = ({ puzzle, isCompleted, variant = 'modal', onClose }) => {
    if (!puzzle || isCompleted) return null;

    const className = variant === 'modal' ? 'instructions-mobile-modal' : 'instructions-sidebar';

    return (
        <div className={`top-instructions ${className}`}>
            <div className="top-instructions-header">
                {variant === 'modal' && (
                    <button className="close-instructions-btn" onClick={onClose}>
                        x
                    </button>
                )}
            </div>
            <div className="top-instructions-body">
                {puzzle.Explanation && puzzle.Explanation.toLowerCase() !== 'none' && (
                    <div className="instructions-section">
                        <span className="top-instructions-label">What is {puzzle.MateType}:</span>
                        <p className="explanation-text">{puzzle.Explanation}</p>
                    </div>
                )}
                {puzzle.Instructions && (
                    <div className="instructions-section">
                        <span className="top-instructions-label">Instructions:</span>
                        <p className="instructions-text">{puzzle.Instructions}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopInstructions;
