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
    onHint,
    onAutoMove,
    onNext,
    onOpenRoadmap
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

            <div className="sidebar-content">
                {isCompleted ? (
                    <PuzzleSolved
                        puzzleIndex={puzzleIndex}
                        totalPuzzles={totalPuzzles}
                        hintsUsed={hintsUsed}
                        onNext={onNext}
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
                        isCompleted={isCompleted}
                    />
                )}
            </div>
        </div>
    );
};

export default Sidebar;
