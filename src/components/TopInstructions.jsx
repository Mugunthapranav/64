import React from 'react';
import './TopInstructions.css';

const TopInstructions = ({ puzzle, isCompleted, variant = 'modal', onClose }) => {
    if (!puzzle || isCompleted) return null;

    const className = variant === 'modal' ? 'instructions-mobile-modal' : 'instructions-sidebar';

    return (
        <div className={`top-instructions ${className}`}>
            <div className="top-instructions-header">
                <span className="top-instructions-label">
                    About
                </span>
                {variant === 'modal' && (
                    <button className="close-instructions-btn" onClick={onClose}>
                        x
                    </button>
                )}
            </div>
            <div className="top-instructions-body">
                <p>{puzzle.Instructions}</p>
            </div>
        </div>
    );
};

export default TopInstructions;
