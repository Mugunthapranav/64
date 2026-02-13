import React, { useState, useEffect } from 'react';
import './ProfileModal.css';

const ProfileModal = ({ profile, xp, puzzlesSolved, onUpdateName, onCompleteSetup, onClose, isOnboarding = false }) => {
    const [editName, setEditName] = useState(profile?.username || '');
    const [isEditing, setIsEditing] = useState(isOnboarding);

    useEffect(() => {
        if (profile) {
            setEditName(profile.username);
        }
    }, [profile]);

    const handleSave = () => {
        if (editName.trim()) {
            onUpdateName(editName.trim());
            setIsEditing(false);
            if (isOnboarding) {
                onCompleteSetup();
            }
        }
    };

    const joinDate = profile ? new Date(profile.joinDate).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    }) : '';

    return (
        <div className="profile-overlay" onClick={!isOnboarding ? onClose : undefined}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-header">
                    <h2>{isOnboarding ? 'Welcome to 64' : 'Profile'}</h2>
                    {!isOnboarding && <button className="close-btn" onClick={onClose}>×</button>}
                </div>

                <div className="profile-content">
                    <div className="profile-main-info">
                        <div className="profile-avatar">
                            {profile?.username?.charAt(0).toUpperCase() || '?'}
                        </div>

                        {isEditing ? (
                            <div className="username-edit-container">
                                <input
                                    type="text"
                                    className="username-input"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter username"
                                    autoFocus
                                />
                                <button className="save-username-btn" onClick={handleSave}>
                                    {isOnboarding ? "Let's Go" : 'Save'}
                                </button>
                            </div>
                        ) : (
                            <div className="username-display">
                                <span className="username-text">{profile?.username}</span>
                                <button className="edit-icon-btn" onClick={() => setIsEditing(true)}>
                                    ✎
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="profile-stats-grid">
                        <div className="stat-card">
                            <span className="stat-value">{xp.toLocaleString()}</span>
                            <span className="stat-label">Total XP</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{puzzlesSolved}</span>
                            <span className="stat-label">Puzzles Done</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{profile?.streak || 0}</span>
                            <span className="stat-label">Day Streak</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{joinDate}</span>
                            <span className="stat-label">Joined</span>
                        </div>
                    </div>

                    {isOnboarding && (
                        <p className="onboarding-hint">
                            We've generated a name for you, but feel free to change it!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
