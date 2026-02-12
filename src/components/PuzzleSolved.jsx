import React from 'react';
import './PuzzleSolved.css';

const PuzzleSolved = ({ puzzleIndex, totalPuzzles, hintsUsed, onNext, variant = 'modal' }) => {
    const stars = Math.max(1, 3 - (hintsUsed * 0.5));
    const fullStars = Math.floor(stars);
    const hasHalfStar = stars % 1 !== 0;

    const renderStars = () => {
        const starElements = [];
        for (let i = 1; i <= 3; i++) {
            if (i <= fullStars) {
                starElements.push(<span key={i} className="star-icon filled">★</span>);
            } else if (i === fullStars + 1 && hasHalfStar) {
                starElements.push(<span key={i} className="star-icon half">★</span>);
            } else {
                starElements.push(<span key={i} className="star-icon empty">☆</span>);
            }
        }
        return starElements;
    };

    const containerClass = variant === 'modal' ? 'puzzle-solved-modal' : 'puzzle-solved-sidebar';

    return (
        <div className={`puzzle-solved-container ${containerClass}`}>
            <div className="solved-badge">SOLVED 💯</div>
            <div className="star-rating">
                {renderStars()}
            </div>
            <div className="solved-stats">
                {hintsUsed > 0 && (
                    <span className="hints-text">{hintsUsed} help{hintsUsed > 1 ? 's' : ''} used</span>
                )}
            </div>
            <button className="btn-next-large" onClick={onNext}>
                Next Puzzle
            </button>
        </div>
    );
};

export default PuzzleSolved;
