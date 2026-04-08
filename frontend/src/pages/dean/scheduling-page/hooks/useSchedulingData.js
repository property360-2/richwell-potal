/**
 * File: useSchedulingData.js
 * Description: Custom hook for managing the scheduling dashboard state and business logic in the Dean module.
 * It handles data fetching for faculty, sections, rooms, and terms, as well as availability updates and publishing.
 */

import { useState, useEffect, useCallback } from 'react';
import { schedulingApi } from '../../../../api/scheduling';
import { facultyApi } from '../../../../api/faculty';
import { sectionsApi } from '../../../../api/sections';
import { termsApi } from '../../../../api/terms';
import { facilitiesApi } from '../../../../api/facilities';
import { useToast } from '../../../../components/ui/Toast';

export const useSchedulingData = () => {
    const [view, setView] = useState('LIST'); // 'LIST' or 'MANAGE'
    const [activeTab, setActiveTab] = useState('professors'); // 'professors' or 'sections'
    const [loading, setLoading] = useState(true);
    const [activeTerm, setActiveTerm] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Data Lists
    const [professors, setProfessors] = useState([]);
    const [sections, setSections] = useState([]);
    const [rooms, setRooms] = useState([]);
    
    // Selected Context
    const [selectedProf, setSelectedProf] = useState(null);
    const [selectedSection, setSelectedSection] = useState(null);
    const [profSchedules, setProfSchedules] = useState([]);
    const [profAvailability, setProfAvailability] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    
    // UI State
    const [isSavingAvailability, setIsSavingAvailability] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddLoadModalOpen, setIsAddLoadModalOpen] = useState(false);
    const [isRandomizeModalOpen, setIsRandomizeModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isRandomizing, setIsRandomizing] = useState(false);

    const { showToast } = useToast();

    /**
     * Fetches initialization data: terms, professors, sections, and rooms.
     */
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const termRes = await termsApi.getTerms({ is_active: true });
            const term = termRes.data.results?.[0] || termRes.data[0];
            setActiveTerm(term);

            if (term) {
                const [profRes, sectionRes, roomRes] = await Promise.all([
                    facultyApi.getAll(),
                    sectionsApi.getSections({ term_id: term.id }),
                    facilitiesApi.getRooms()
                ]);
                setProfessors(profRes.data.results || profRes.data);
                setSections(sectionRes.data.results || sectionRes.data);
                setRooms(roomRes.data.results || roomRes.data);
            }
        } catch (err) {
            showToast('error', 'Failed to load initial data');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /**
     * Fetches detailed schedule and availability for a specific faculty member.
     * @param {string} profId - The ID of the faculty member.
     */
    const fetchProfDetails = async (profId) => {
        if (!activeTerm) return;
        try {
             const [schedRes, availRes, slotsRes] = await Promise.all([
                schedulingApi.getSchedules({ professor_id: profId, term_id: activeTerm.id }),
                facultyApi.getAvailability(profId),
                schedulingApi.getAvailableSlots({ professor_id: profId, term_id: activeTerm.id })
            ]);
            setProfSchedules(schedRes.data.results || schedRes.data);
            setProfAvailability(availRes.data);
            setAvailableSlots(slotsRes.data || []);
        } catch (err) {
            showToast('error', 'Failed to load professor details');
        }
    };

    /**
     * Fetches detailed schedule for a specific section.
     * @param {string} sectionId - The ID of the section.
     */
    const fetchSectionDetails = async (sectionId) => {
        if (!activeTerm) return;
        try {
            setProfAvailability([]); 
            const schedRes = await schedulingApi.getSchedules({ section_id: sectionId, term_id: activeTerm.id });
            setProfSchedules(schedRes.data.results || schedRes.data);
        } catch (err) {
            showToast('error', 'Failed to load section details');
        }
    };

    /**
     * Prepares for managing loading for a specific professor.
     * @param {object} prof - The faculty member object.
     */
    const handleManageLoad = (prof) => {
        setSelectedProf(prof);
        setSelectedSection(null);
        fetchProfDetails(prof.id);
        setView('MANAGE');
    };

    /**
     * Prepares for managing loading for a specific section.
     * @param {object} section - The section object.
     */
    const handleManageSection = (section) => {
        setSelectedSection(section);
        setSelectedProf(null);
        fetchSectionDetails(section.id);
        setView('MANAGE');
    };

    /**
     * Returns to the main dashboard list view.
     */
    const handleBackToList = () => {
        setView('LIST');
        setSelectedProf(null);
        setSelectedSection(null);
        fetchData(); 
    };

    /**
     * Toggles faculty availability for a particular day and session.
     * @param {string} day - The day key (e.g., 'M', 'T').
     * @param {string} session - The session (e.g., 'AM', 'PM').
     */
    const handleToggleAvailability = async (day, session) => {
        if (!selectedProf) return;
        const isCurrentlyAvailable = profAvailability.some(a => a.day === day && a.session === session);
        
        if (isCurrentlyAvailable) {
            const hasSchedule = profSchedules.find(s => s.days.includes(day) && s.section_session === session);
            if (hasSchedule) {
                return showToast('warning', `Slot occupied by ${hasSchedule.subject_code} (${hasSchedule.section_name})`);
            }
        }

        let newAvailabilities;
        if (isCurrentlyAvailable) {
            newAvailabilities = profAvailability.filter(a => !(a.day === day && a.session === session))
                .map(a => ({ day: a.day, session: a.session }));
        } else {
            newAvailabilities = [
                ...profAvailability.map(a => ({ day: a.day, session: a.session })),
                { day: day, session: session }
            ];
        }

        try {
            setIsSavingAvailability(true);
            await facultyApi.updateAvailability(selectedProf.id, newAvailabilities);
            setProfAvailability(newAvailabilities);
            showToast('success', 'Availability updated');
        } catch (err) {
            showToast('error', 'Failed to update availability');
        } finally {
            setIsSavingAvailability(false);
        }
    };

    /**
     * Quickly fills availability for all days for a specific session.
     * @param {string} sessionType - The session (e.g., 'AM', 'PM').
     */
    const handleQuickAvailability = async (sessionType) => {
        if (!selectedProf) return;
        const DAYS = ['M', 'T', 'W', 'TH', 'F', 'S'];
        const newAvail = DAYS.map(d => ({ day: d, session: sessionType }));
        try {
            setIsSavingAvailability(true);
            await facultyApi.updateAvailability(selectedProf.id, newAvail);
            setProfAvailability(newAvail);
            showToast('success', `All days set to ${sessionType}`);
        } catch (err) {
            showToast('error', 'Failed to update availability');
        } finally {
            setIsSavingAvailability(false);
        }
    };

    /**
     * Finalizes and publishes the current term's schedule.
     */
    const handlePublishSchedule = async () => {
        if (!activeTerm) return;
        if (!window.confirm('Finalize and notify students? Students will receive a notification that the full timetable (Rooms/Professors) is now ready.')) return;
        try {
            setIsPublishing(true);
            await schedulingApi.publish({ term_id: activeTerm.id });
            showToast('success', 'Schedule published successfully.');
            fetchData();
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Failed to publish');
        } finally {
            setIsPublishing(false);
        }
    };

    return {
        view, setView,
        activeTab, setActiveTab,
        loading,
        activeTerm,
        searchQuery, setSearchQuery,
        professors,
        sections,
        rooms,
        selectedProf,
        selectedSection,
        profSchedules,
        profAvailability,
        availableSlots,
        isSavingAvailability,
        isModalOpen, setIsModalOpen,
        isAddLoadModalOpen, setIsAddLoadModalOpen,
        isRandomizeModalOpen, setIsRandomizeModalOpen,
        selectedSchedule, setSelectedSchedule,
        isPublishing,
        isRandomizing, setIsRandomizing,
        handleManageLoad,
        handleManageSection,
        handleBackToList,
        handleToggleAvailability,
        handleQuickAvailability,
        handlePublishSchedule,
        fetchProfDetails,
        fetchSectionDetails,
        fetchData
    };
};
