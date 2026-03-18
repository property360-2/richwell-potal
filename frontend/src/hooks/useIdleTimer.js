import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export const useIdleTimer = (timeoutMinutes = 30, warningMinutes = 25) => {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [showWarning, setShowWarning] = useState(false);

    const timeoutId = useRef(null);
    const warningId = useRef(null);

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = warningMinutes * 60 * 1000;

    const resetTimer = useCallback(() => {
        if (!isAuthenticated) return;

        if (timeoutId.current) clearTimeout(timeoutId.current);
        if (warningId.current) clearTimeout(warningId.current);

        setShowWarning(false);

        warningId.current = setTimeout(() => {
            setShowWarning(true);
        }, warningMs);

        timeoutId.current = setTimeout(() => {
            logout();
            navigate('/login?reason=idle');
        }, timeoutMs);
    }, [isAuthenticated, logout, navigate, timeoutMs, warningMs]);

    useEffect(() => {
        if (!isAuthenticated) return;

        resetTimer();

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        let lastActivity = Date.now();

        const handleUserActivity = () => {
            const now = Date.now();
            if (now - lastActivity > 1000) { // Throttle to once per second
                lastActivity = now;
                // Only auto-reset if the warning is NOT showing.
                // If warning is showing, we want explicit user interaction with the modal.
                setShowWarning(prev => {
                    if (!prev) resetTimer();
                    return prev;
                });
            }
        };

        events.forEach(event => {
            window.addEventListener(event, handleUserActivity);
        });

        return () => {
            if (timeoutId.current) clearTimeout(timeoutId.current);
            if (warningId.current) clearTimeout(warningId.current);
            events.forEach(event => {
                window.removeEventListener(event, handleUserActivity);
            });
        };
    }, [isAuthenticated, resetTimer]);

    return {
        showWarning,
        extendSession: resetTimer,
        timeLeft: timeoutMinutes - warningMinutes
    };
};
