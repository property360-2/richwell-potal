
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '../api';

const mapSubject = (s) => ({
    ...s,
    id: s.id,
    code: s.code,
    title: s.title || s.name,
    units: parseFloat(s.units || 0),
    sections: (s.available_sections || s.sections || []).map(sec => ({
        id: sec.id,
        name: sec.name || sec.section_name,
        slots: sec.slots || 40,
        enrolled: sec.enrolled_count || 0
    }))
});

const fetchEnrollmentData = async () => {
    // SubjectEnrollmentPage used /api/v1/admissions/enrollment/data/
    // We'll use api.get to ensure auth headers
    const data = await api.get('/admissions/enrollment/data/');

    // api.get returns the json response directly (usually)
    // The endpoint returns { recommendedSubjects, availableSubjects, ... }

    return {
        recommendedSubjects: (data.recommendedSubjects || []).map(mapSubject),
        availableSubjects: (data.availableSubjects || []).map(mapSubject),
        enrolledSubjects: data.enrolledSubjects || [],
        maxUnits: data.maxUnits || 24,
        enrollmentStatus: data.enrollmentStatus?.status || data.enrollmentStatus,
        activeSemester: data.active_semester
    };
};

export const useEnrollmentData = () => {
    return useQuery({
        queryKey: ['enrollment-data'],
        queryFn: fetchEnrollmentData,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true
    });
};

export const useEnrollSubjects = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload) => {
            // payload: { enrollments: [{ subject, section }] }
            // Endpoint: /api/v1/admissions/enrollment/enroll/
            return api.post('/admissions/enrollment/enroll/', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrollment-data'] });
            queryClient.invalidateQueries({ queryKey: ['schedule'] }); // Schedule changes too
        }
    });
};
