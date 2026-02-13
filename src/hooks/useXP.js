import { useState, useEffect, useCallback } from 'react';
import { getGlobalXP, setGlobalXP } from '../utils/db';

const useXP = () => {
    const [xp, setXP] = useState(0);

    useEffect(() => {
        const loadXP = async () => {
            let currentXP = await getGlobalXP();

            const saved = localStorage.getItem('chessy-xp');
            if (saved && currentXP === 0) {
                currentXP = parseInt(saved, 10);
                await setGlobalXP(currentXP);
                localStorage.removeItem('chessy-xp');
            }

            setXP(currentXP);
        };
        loadXP();
    }, []);

    const addXP = useCallback(async (amount) => {
        if (typeof amount !== 'number' || isNaN(amount)) return;
        setXP(prev => {
            const next = prev + amount;
            setGlobalXP(next);
            return next;
        });
    }, []);

    return {
        xp,
        addXP
    };
};

export default useXP;
