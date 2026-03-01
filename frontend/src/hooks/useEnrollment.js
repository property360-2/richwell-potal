
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '../api';

const mapSubject = (s) => ({
    ...s,
    id: s.id,
    code: s.code,
    title: s.title || s.name,
    units: parseFloat(s.units || 0),
    sections: (s.available_sections || s.sections || []).map(sec => ({
        id: sec.id || sec.section_id,
        name: sec.name || sec.section_name,
        slots: sec.slots || sec.available_slots || 40,
        enrolled: sec.enrolled || sec.enrolled_count || 0,
        professor: sec.professor || 'TBA',
        schedule: sec.schedule || []
    }))
});

const fetchEnrollmentData = async () => {
    // We fetch from separate endpoints defined in api.jsx
    try {
        const [recommendedData, availableData, myEnrollmentsData, enrollmentInfo] = await Promise.all([
            api.get(endpoints.recommendedSubjects).catch(() => ({ recommended_subjects: [], max_units: 30 })),
            api.get(endpoints.availableSubjects).catch(() => ({ available_subjects: [] })),
            api.get(endpoints.myEnrollments).catch(() => ({ subject_enrollments: [], enrolled_units: 0 })),
            api.get(endpoints.myEnrollment).catch(() => null)
        ]);

        return {
            recommendedSubjects: (recommendedData?.recommended_subjects || []).map(mapSubject),
            availableSubjects: (availableData?.available_subjects || []).map(mapSubject),
            enrolledSubjects: (myEnrollmentsData?.subject_enrollments || []),
            maxUnits: recommendedData?.max_units || 30,
            enrollmentStatus: enrollmentInfo?.status || 'N/A',
            activeSemester: enrollmentInfo?.semester || null,
            studentProfile: enrollmentInfo?.student_profile || recommendedData?.student_profile || null
        };
    } catch (err) {
        console.error("Failed to fetch full enrollment data bundle", err);
        throw err;
    }
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
            // payload: { enrollments: [{ subject: subject_id, section: section_id }] }
            // Backend BulkEnrollSubjectView expects subject_id and section_id in a nested list
            // Transform frontend payload to backend expected structure:
            // { enrollments: [{ subject_id, section_id }] }
            const transformedPayload = {
                enrollments: payload.enrollments.map(e => ({
                    subject_id: e.subject,
                    section_id: e.section
                }))
            };
            return api.post(endpoints.bulkEnrollSubject, transformedPayload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrollment-data'] });
            queryClient.invalidateQueries({ queryKey: ['schedule'] }); // Schedule changes too
        }
    });
};

export const useAutoAssignEnrollment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (shift) => {
            return api.post('/admissions/enrollment/subjects/auto-assign/', { shift });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrollment-data'] });
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
        }
    });
};
