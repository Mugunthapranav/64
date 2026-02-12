import React from 'react';
import './Navbar.css';

const Navbar = ({ onOpenRoadmap, onToggleEngineMode, isEngineMode }) => {
    return (
        <nav className="navbar">
            <div className="navbar-left">
                <span className="navbar-logo">chessy</span>
            </div>
            <div className="navbar-right">
                <button
                    className={`navbar-btn ${isEngineMode ? 'active' : ''}`}
                    onClick={onToggleEngineMode}
                >
                    {isEngineMode ? 'Puzzle' : 'Stockfish'}
                </button>
                <button className="navbar-btn" onClick={onOpenRoadmap}>
                    Roadmap
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
