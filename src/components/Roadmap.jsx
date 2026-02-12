import React from 'react';
import './Roadmap.css';

const Roadmap = ({ roadmapData, currentPuzzleIndex, solvedResults, onSelect, onClose }) => {
    return (
        <div className="roadmap-overlay" onClick={onClose}>
            <div className="roadmap-modal" onClick={e => e.stopPropagation()}>
                <div className="roadmap-header">
                    <h2>Roadmap</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="roadmap-path">
                    {roadmapData.map((level, levelIdx) => (
                        <div key={level.level} className="level-section">
                            <div className="level-header">
                                <span className="level-label">Level {level.level}</span>
                                <div className="level-line"></div>
                            </div>

                            <div className="parts-container">
                                {level.parts.map((part, partIdx) => {
                                    const pIds = part.puzzleIds || [];
                                    const sResults = solvedResults || {};
                                    const solvedPuzzles = pIds.filter(id => sResults[id]);
                                    const solvedCount = solvedPuzzles.length;
                                    const totalCount = part.puzzleCount || 1;
                                    const isMastered = solvedCount === totalCount;

                                    const isActive = currentPuzzleIndex >= part.firstPuzzleIndex &&
                                        currentPuzzleIndex < part.firstPuzzleIndex + totalCount;

                                    // Calculate average stars for the solved puzzles in this part
                                    const totalStars = solvedPuzzles.reduce((sum, id) => sum + (sResults[id] || 0), 0);
                                    const avgStars = solvedCount > 0 ? (totalStars / solvedCount) : 0;

                                    // Progress circle math
                                    const radius = 36;
                                    const circumference = 2 * Math.PI * radius;
                                    const progress = solvedCount / totalCount;
                                    const offsetValue = circumference - (progress * circumference);

                                    // Zig-zag offset logic
                                    const offset = (partIdx % 3 === 0) ? 'center' : (partIdx % 3 === 1) ? 'left' : 'right';

                                    return (
                                        <div
                                            key={part.name}
                                            className={`roadmap-node-container ${offset} ${isActive ? 'active' : ''} ${isMastered ? 'completed' : ''}`}
                                        >
                                            <div className="node-wrapper">
                                                <svg className="progress-ring" width="80" height="80">
                                                    <circle
                                                        className="progress-ring-bg"
                                                        stroke="rgba(255, 255, 255, 0.05)"
                                                        strokeWidth="4"
                                                        fill="transparent"
                                                        r={radius}
                                                        cx="40"
                                                        cy="40"
                                                    />
                                                    <circle
                                                        className="progress-ring-fill"
                                                        stroke="white"
                                                        strokeWidth="4"
                                                        strokeDasharray={`${circumference} ${circumference}`}
                                                        style={{ strokeDashoffset: offsetValue }}
                                                        strokeLinecap="round"
                                                        fill="transparent"
                                                        r={radius}
                                                        cx="40"
                                                        cy="40"
                                                    />
                                                </svg>
                                                <button
                                                    className={`roadmap-node ${isActive ? 'active' : ''} ${isMastered ? 'completed' : ''}`}
                                                    onClick={() => onSelect(part.firstPuzzleIndex)}
                                                >
                                                    {isMastered ? '✓' : partIdx + 1}
                                                    <div className="node-glow"></div>

                                                    {isMastered && avgStars > 0 && (
                                                        <div className="node-stars">
                                                            {'★'.repeat(Math.round(avgStars))}
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="node-info">
                                                <span className="node-label">{part.name}</span>
                                                <span className="node-progress">{solvedCount}/{totalCount}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Roadmap;
