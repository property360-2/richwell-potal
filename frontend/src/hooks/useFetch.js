import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../api/axios';

export const useFetch = (url, options = {}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Use stable options for dependency array
    const stableOptions = JSON.stringify(options);
    const abortControllerRef = useRef(null);

    const fetchData = useCallback(
        async (configOverride = {}) => {
            // Cancel previous in-flight request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;

            setLoading(true);
            setError(null);

            try {
                const response = await api({
                    url,
                    ...JSON.parse(stableOptions),
                    ...configOverride,
                    signal: controller.signal
                });

                setData(response.data);
                return { data: response.data, error: null };
            } catch (err) {
                // Ignore errors from aborted requests
                if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
                    return { data: null, error: null };
                }
                const errorMsg = err.response?.data?.message || err.message || 'An error occurred';
                setError(errorMsg);
                return { data: null, error: errorMsg };
            } finally {
                if (abortControllerRef.current === controller) {
                    setLoading(false);
                }
            }
        },
        [url, stableOptions]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return { data, loading, error, fetchData, setData };
};
