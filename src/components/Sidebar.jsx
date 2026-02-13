import React from 'react';
import TopInstructions from './TopInstructions';
import PuzzleControls from './PuzzleControls';
import PuzzleSolved from './PuzzleSolved';
import './Sidebar.css';

const Sidebar = ({
    puzzle,
    puzzleIndex,
    totalPuzzles,
    isCompleted,
    hintsUsed,
    earnedXP,
    onHint,
    onAutoMove,
    onNext,
    onPrev,
    onReplay,
    onOpenRoadmap,
    isCurrentPuzzleSolved
}) => {
    if (!puzzle) return null;

    return (
        <div className="sidebar desktop-only">
            <div className="sidebar-header">
                <div className="sidebar-top-row">
                    <span className="sidebar-title">
                        {isCompleted ? ' ' : puzzle.MateType}
                    </span>
                </div>
            </div>

            <div className={`sidebar-content ${isCompleted ? 'solved-center' : ''}`}>
                {isCompleted ? (
                    <PuzzleSolved
                        puzzleIndex={puzzleIndex}
                        totalPuzzles={totalPuzzles}
                        hintsUsed={hintsUsed}
                        earnedXP={earnedXP}
                        onNext={onNext}
                        onPrev={onPrev}
                        onReplay={onReplay}
                        isCurrentPuzzleSolved={isCurrentPuzzleSolved}
                        variant="sidebar"
                    />
                ) : (
                    <>
                        <TopInstructions
                            puzzle={puzzle}
                            isCompleted={isCompleted}
                            variant="sidebar"
                        />
                    </>
                )}
            </div>

            <div className="sidebar-footer">
                {!isCompleted && (
                    <PuzzleControls
                        onHint={onHint}
                        onAutoMove={onAutoMove}
                        onNext={onNext}
                        onPrev={onPrev}
                        onReplay={onReplay}
                        isCompleted={isCompleted}
                        isCurrentPuzzleSolved={isCurrentPuzzleSolved}
                        puzzleIndex={puzzleIndex}
                        totalPuzzles={totalPuzzles}
                    />
                )}
            </div>
        </div>
    );
};

export default Sidebar;
