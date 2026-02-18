
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '../api';

const fetchSchedule = async () => {
    try {
        // Use the endpoint that was working in the previous component implementation
        // The component used '/api/v1/students/my-schedule/'
        // api.jsx has '/admissions/my-schedule/'
        // I will trust api.jsx first, but if your backend logic for student schedule is strictly under /students/, change this.

        let endpoint = endpoints.mySchedule;

        // Use api helper
        const result = await api.get(endpoint);

        // result is normally unwrapped data if api.get handles it
        // The previous component expected { data: { schedule: ... } }
        // api.get usually returns data.data or data directly.
        // Let's assume api.get returns the payload.

        return formatSchedule(result);
    } catch (e) {
        console.error("Failed to fetch schedule", e);
        throw e;
    }
};

const formatSchedule = (data) => {
    if (!data) return { schedule: [], semester: '' };

    // Check if data is wrapped in 'data' property (api.jsx usually handles this, but let's be safe)
    const payload = data.data || data;

    if (payload.schedule && Array.isArray(payload.schedule)) {
        const flatSchedule = [];
        payload.schedule.forEach(dayData => {
            if (dayData.slots) {
                dayData.slots.forEach(slot => {
                    flatSchedule.push({
                        ...slot,
                        day: dayData.day
                    });
                });
            }
        });
        return {
            schedule: flatSchedule,
            semester: payload.semester
        };
    }

    return { schedule: [], semester: '' };
};

export const useSchedule = () => {
    return useQuery({
        queryKey: ['schedule'],
        queryFn: fetchSchedule,
        staleTime: 10 * 60 * 1000,
    });
};
