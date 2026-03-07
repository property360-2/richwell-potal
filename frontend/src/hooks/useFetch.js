import { useState, useCallback } from 'react';
import api from '../api/axios';

export const useFetch = (url, options = {}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(
        async (configOverride = {}) => {
            setLoading(true);
            setError(null);

            try {
                const response = await api({
                    url,
                    ...options,
                    ...configOverride,
                });

                setData(response.data);
                return { data: response.data, error: null };
            } catch (err) {
                const errorMsg = err.response?.data?.message || err.message || 'An error occurred';
                setError(errorMsg);
                return { data: null, error: errorMsg };
            } finally {
                setLoading(false);
            }
        },
        [url, options] // Stringifying options might be needed if object reference changes often
    );

    return { data, loading, error, fetchData, setData };
};
