import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUserProfile, setUserProfile } from '../utils/db';

const ADJECTIVES = ['Bold', 'Swift', 'Cunning', 'Sturdy', 'Silent', 'Mighty', 'Wise', 'Grand', 'Noble', 'Quick'];
const CHESS_PIECES = ['Gambit', 'Knight', 'Bishop', 'Rook', 'Queen', 'King', 'Pawn', 'Grandmaster', 'Master', 'Scholar'];

const generateRandomUsername = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const piece = CHESS_PIECES[Math.floor(Math.random() * CHESS_PIECES.length)];
    const num = Math.floor(100 + Math.random() * 899);
    return `${adj}${piece}${num}`;
};

const useProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasInitialized = React.useRef(false);

    const loadProfile = useCallback(async () => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        setLoading(true);
        let data = await getUserProfile();

        if (!data) {
            data = {
                username: generateRandomUsername(),
                joinDate: new Date().toISOString(),
                lastActive: new Date().toISOString(),
                streak: 1,
                hasSetup: false
            };
            await setUserProfile(data);
        } else {
            const lastActive = new Date(data.lastActive);
            const today = new Date();

            const lastActiveDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
            const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            const diffDays = Math.floor((todayDate - lastActiveDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                data.streak += 1;
                data.lastActive = today.toISOString();
                await setUserProfile(data);
            } else if (diffDays > 1) {
                data.streak = 1;
                data.lastActive = today.toISOString();
                await setUserProfile(data);
            } else if (diffDays === 0) {
                data.lastActive = today.toISOString();
                await setUserProfile(data);
            }
        }

        setProfile(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const updateUsername = async (newUsername) => {
        if (!profile) return;
        const updated = { ...profile, username: newUsername, hasSetup: true };
        await setUserProfile(updated);
        setProfile(updated);
    };

    const completeSetup = async () => {
        if (!profile) return;
        const updated = { ...profile, hasSetup: true };
        await setUserProfile(updated);
        setProfile(updated);
    };

    return {
        profile,
        loading,
        updateUsername,
        completeSetup,
        refreshProfile: loadProfile
    };
};

export default useProfile;
