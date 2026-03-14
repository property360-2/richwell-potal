import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/Toast';

export const useIdleTimer = (timeoutMinutes = 30, warningMinutes = 25) => {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const timeoutId = useRef(null);
    const warningId = useRef(null);

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = warningMinutes * 60 * 1000;

    const resetTimer = () => {
        if (!isAuthenticated) return;

        if (timeoutId.current) clearTimeout(timeoutId.current);
        if (warningId.current) clearTimeout(warningId.current);

        warningId.current = setTimeout(() => {
            addToast(`For your security, you will be logged out in ${timeoutMinutes - warningMinutes} minutes due to inactivity.`, 'warning', 30000);
        }, warningMs);

        timeoutId.current = setTimeout(() => {
            logout();
            navigate('/login?reason=idle');
        }, timeoutMs);
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        resetTimer();

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        // Use a throttled version for performance if needed, 
        // but clearing timeouts is cheap enough for standard use
        let lastActivity = Date.now();
        const handleUserActivity = () => {
            const now = Date.now();
            if (now - lastActivity > 1000) { // Throttle to once per second
                lastActivity = now;
                resetTimer();
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
    }, [isAuthenticated, timeoutMinutes, warningMinutes]);
};
