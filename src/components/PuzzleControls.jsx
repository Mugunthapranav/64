import React from 'react';
import './PuzzleControls.css';

const PuzzleControls = ({
    onHint,
    onAutoMove,
    onNext,
    onPrev,
    onReplay,
    onToggleInstructions,
    showGoal,
    isCompleted,
    isCurrentPuzzleSolved,
    puzzleIndex,
    totalPuzzles
}) => {
    if (isCompleted) return null;

    const isFirstPuzzle = puzzleIndex === 0;
    const isLastPuzzle = puzzleIndex === totalPuzzles - 1;

    return (
        <div className="puzzle-controls">
            <div className="controls-row top-row">
                <button
                    className={`action-btn prev-btn ${isFirstPuzzle ? 'disabled' : ''}`}
                    onClick={onPrev}
                    disabled={isFirstPuzzle}
                    title={isFirstPuzzle ? "This is the first puzzle" : "Previous Puzzle"}
                >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                </button>
                <button
                    className="action-btn replay-btn"
                    onClick={onReplay}
                    title="Replay Puzzle"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                    </svg>
                </button>
                <button
                    className={`action-btn next-btn ${(!isCurrentPuzzleSolved || isLastPuzzle) ? 'disabled' : ''}`}
                    onClick={onNext}
                    disabled={!isCurrentPuzzleSolved || isLastPuzzle}
                    title={isLastPuzzle ? "This is the last puzzle" : (isCurrentPuzzleSolved ? "Next Puzzle" : "Finish current puzzle to unlock next")}
                >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                </button>
            </div>

            <div className="controls-row bottom-row">
                <button className="action-btn info-btn" onClick={onToggleInstructions} title="Show Goal & Explanation">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z" />
                    </svg>
                </button>
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
