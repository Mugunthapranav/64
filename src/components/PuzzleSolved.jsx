import React from 'react';
import './PuzzleSolved.css';

const PuzzleSolved = ({
    puzzleIndex,
    totalPuzzles,
    hintsUsed,
    earnedXP,
    onNext,
    onPrev,
    onReplay,
    isCurrentPuzzleSolved,
    variant = 'modal'
}) => {
    const stars = Math.max(1, 3 - (hintsUsed * 0.5));
    const fullStars = Math.floor(stars);
    const hasHalfStar = stars % 1 !== 0;

    const renderStars = () => {
        const icons = [];
        for (let i = 0; i < 3; i++) {
            if (i < fullStars) {
                icons.push(<span key={i} className="star full">★</span>);
            } else if (i === fullStars && hasHalfStar) {
                icons.push(<span key={i} className="star half">★</span>);
            } else {
                icons.push(<span key={i} className="star empty">★</span>);
            }
        }
        return icons;
    };

    const isFirstPuzzle = puzzleIndex === 0;
    const isLastPuzzle = puzzleIndex === totalPuzzles - 1;

    return (
        <div className={`puzzle-solved ${variant}`}>
            <h2 className="solved-title">SOLVED</h2>
            <div className="solved-stars">
                {renderStars()}
            </div>
            <div className="solved-stats">
                <div className="xp-earned">+{earnedXP} XP</div>
                {hintsUsed > 0 && (
                    <span className="hints-text">{hintsUsed} help{hintsUsed > 1 ? 's' : ''} used</span>
                )}
            </div>

            <div className="solved-navigation">
                <button
                    className={`nav-btn prev ${isFirstPuzzle ? 'disabled' : ''}`}
                    onClick={onPrev}
                    disabled={isFirstPuzzle}
                    title={isFirstPuzzle ? "This is the first puzzle" : "Previous"}
                >
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                </button>
                <button className="nav-btn replay" onClick={onReplay} title="Replay">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                    </svg>
                </button>
                <button
                    className={`nav-btn next ${(!isCurrentPuzzleSolved || isLastPuzzle) ? 'disabled' : ''}`}
                    onClick={onNext}
                    disabled={!isCurrentPuzzleSolved || isLastPuzzle}
                    title={isLastPuzzle ? "This is the last puzzle" : "Next"}
                >
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default PuzzleSolved;
