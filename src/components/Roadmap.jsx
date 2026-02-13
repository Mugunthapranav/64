import React, { useMemo } from 'react';
import './Roadmap.css';

const Roadmap = ({ roadmapData, currentPuzzleIndex, solvedResults, onSelect, onClose }) => {
    const visibleLevels = useMemo(() => {
        let foundCurrentPart = false;
        const sResults = solvedResults || {};

        return roadmapData.map((level) => {
            const visibleLevelParts = [];

            for (const part of level.parts) {
                if (foundCurrentPart) break;

                const pIds = part.puzzleIds || [];
                const solvedCount = pIds.filter(id => sResults[id]).length;
                const isMastered = solvedCount === (part.puzzleCount || 1);

                const solvedPuzzles = pIds.filter(id => sResults[id]);
                const totalStars = solvedPuzzles.reduce((sum, id) => sum + (sResults[id] || 0), 0);
                const avgStars = solvedCount > 0 ? (totalStars / solvedCount) : 0;

                const radius = 36;
                const circumference = 2 * Math.PI * radius;
                const progress = solvedCount / (part.puzzleCount || 1);
                const offsetValue = circumference - (progress * circumference);

                visibleLevelParts.push({
                    ...part,
                    isMastered,
                    solvedCount,
                    totalCount: part.puzzleCount || 1,
                    pIds,
                    avgStars,
                    circumference,
                    offsetValue
                });

                if (!isMastered) {
                    foundCurrentPart = true;
                }
            }

            if (visibleLevelParts.length === 0) return null;

            return {
                ...level,
                parts: visibleLevelParts
            };
        }).filter(Boolean);
    }, [roadmapData, solvedResults]);

    return (
        <div className="roadmap-overlay" onClick={onClose}>
            <div className="roadmap-modal" onClick={e => e.stopPropagation()}>
                <div className="roadmap-header">
                    <h2>Roadmap</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="roadmap-path">
                    {visibleLevels.map((level, levelIdx) => (
                        <div key={level.level} className="level-section">
                            <div className="level-header">
                                <span className="level-label">Level {level.level}</span>
                                <div className="level-line"></div>
                            </div>

                            <div className="parts-container">
                                {level.parts.map((part, partIdx) => {
                                    const isActive = currentPuzzleIndex >= part.firstPuzzleIndex &&
                                        currentPuzzleIndex < part.firstPuzzleIndex + part.totalCount;

                                    const offset = (partIdx % 3 === 0) ? 'center' : (partIdx % 3 === 1) ? 'left' : 'right';

                                    return (
                                        <div
                                            key={part.name}
                                            className={`roadmap-node-container ${offset} ${isActive ? 'active' : ''} ${part.isMastered ? 'completed' : ''}`}
                                        >
                                            <div className="node-wrapper">
                                                <svg className="progress-ring" width="80" height="80">
                                                    <circle
                                                        className="progress-ring-bg"
                                                        stroke="rgba(255, 255, 255, 0.05)"
                                                        strokeWidth="4"
                                                        fill="transparent"
                                                        r="36"
                                                        cx="40"
                                                        cy="40"
                                                    />
                                                    <circle
                                                        className="progress-ring-fill"
                                                        stroke="white"
                                                        strokeWidth="4"
                                                        strokeDasharray={`${part.circumference} ${part.circumference}`}
                                                        style={{ strokeDashoffset: part.offsetValue }}
                                                        strokeLinecap="round"
                                                        fill="transparent"
                                                        r="36"
                                                        cx="40"
                                                        cy="40"
                                                    />
                                                </svg>
                                                <button
                                                    className={`roadmap-node ${isActive ? 'active' : ''} ${part.isMastered ? 'completed' : ''}`}
                                                    onClick={() => onSelect(part.firstPuzzleIndex)}
                                                    title={part.name}
                                                >
                                                    {part.isMastered ? '✓' : partIdx + 1}
                                                    <div className="node-glow"></div>

                                                    {part.isMastered && part.avgStars > 0 && (
                                                        <div className="node-stars">
                                                            {'★'.repeat(Math.round(part.avgStars))}
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="node-info">
                                                <span className="node-label">{part.name}</span>
                                                <span className="node-progress">{part.solvedCount}/{part.totalCount}</span>
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
