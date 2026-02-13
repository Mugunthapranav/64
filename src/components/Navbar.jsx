import React from 'react';
import './Navbar.css';

const Navbar = ({ onOpenRoadmap, onToggleEngineMode, isEngineMode, xp = 0, streak = 0, onOpenProfile }) => {
    return (
        <nav className="navbar">
            <div className="navbar-left">
                <span className="navbar-logo">64</span>
            </div>
            <div className="navbar-right">

                <button
                    className={`navbar-btn ${isEngineMode ? 'active' : ''}`}
                    onClick={onToggleEngineMode}
                >
                    {isEngineMode ? 'Puzzle' : 'Engine'}
                </button>
                <button className="navbar-btn" onClick={onOpenRoadmap}>
                    Map
                </button>
                <button className="navbar-right-stats" onClick={onOpenProfile}>
                    <div className="stat-badge streak-badge">
                        <span className="stat-value">{streak}</span>
                        <span className="stat-icon">🔥</span>
                    </div>
                    <div className="stat-badge xp-badge">
                        <span className="stat-value">{xp.toLocaleString()}</span>
                        <span className="stat-label">XP</span>
                    </div>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
