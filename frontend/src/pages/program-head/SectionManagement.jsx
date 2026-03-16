import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Users, LayoutGrid, Clock, ChevronRight, AlertCircle, ArrowLeft, MoreVertical, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { sectionsApi } from '../../api/sections';
import { schedulingApi } from '../../api/scheduling';
import { termsApi } from '../../api/terms';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import Tabs from '../../components/ui/Tabs';
import PageHeader from '../../components/shared/PageHeader';

import './SectionManagement.css';

const SectionManagement = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    const programId = searchParams.get('program_id');
    const headedPrograms = user?.headed_programs || [];
    const currentProgram = headedPrograms.find(p => p.id === parseInt(programId)) || headedPrograms[0];

    const [activeTerm, setActiveTerm] = useState(null);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedSection, setSelectedSection] = useState(null);
    const [roster, setRoster] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [modalTab, setModalTab] = useState('students');

    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [studentToTransfer, setStudentToTransfer] = useState(null);
    const [targetSectionId, setTargetSectionId] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);

    const fetchData = async () => {
        if (!currentProgram) return;
        try {
            setLoading(true);
            const termsRes = await termsApi.getTerms({ is_active: true });
            const term = termsRes.data.results?.[0] || termsRes.data[0];
            setActiveTerm(term);

            if (term) {
                const sectionsRes = await sectionsApi.getSections({ 
                    term_id: term.id,
                    program_id: currentProgram.id
                });
                setSections(sectionsRes.data.results || sectionsRes.data);
            }
        } catch (err) {
            showToast('error', 'Failed to load sections');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentProgram]);

    const handleOpenDetails = async (section) => {
        setSelectedSection(section);
        setRoster([]);
        setSchedules([]);
        setModalTab('students');
        setIsDetailsOpen(true);
        
        try {
            setDetailsLoading(true);
            const [rosterRes, scheduleRes] = await Promise.all([
                sectionsApi.getSectionRoster(section.id),
                schedulingApi.getSchedules({ section_id: section.id, term_id: activeTerm.id })
            ]);
            setRoster(rosterRes.data);
            setSchedules(scheduleRes.data.results || scheduleRes.data);
        } catch (err) {
            showToast('error', 'Failed to load class details');
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleOpenTransfer = (student) => {
        setStudentToTransfer(student);
        setTargetSectionId('');
        setIsTransferOpen(true);
    };

    const handleConfirmTransfer = async () => {
        if (!targetSectionId) return showToast('error', 'Select a target section');
        
        try {
            setIsTransferring(true);
            await sectionsApi.transferStudent(targetSectionId, {
                student_id: studentToTransfer.student.id || studentToTransfer.student, // Handle different API response structures
                term_id: activeTerm.id
            });
            showToast('success', 'Student transferred successfully');
            setIsTransferOpen(false);
            handleOpenDetails(selectedSection); // Refresh roster
            fetchData(); // Refresh counts
        } catch (err) {
            showToast('error', err.response?.data?.error || 'Transfer failed');
        } finally {
            setIsTransferring(false);
        }
    };

    if (loading && !activeTerm) {
        return (
            <div className="p-8 h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!currentProgram) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Program Not Found</h3>
                <p className="text-slate-500 mt-2">You don't have access to this program or it doesn't exist.</p>
                <Button variant="ghost" className="mt-4" onClick={() => navigate('/program-head')}>Back to Dashboard</Button>
            </div>
        );
    }

    const rosterColumns = [
        { header: 'IDN', accessor: 'student_idn' },
        { header: 'Full Name', accessor: 'student_name' },
        {
            header: 'Actions',
            align: 'right',
            render: (row) => (
                <Button 
                    variant="ghost" 
                    size="xs" 
                    className="text-blue-600 font-bold hover:bg-blue-50"
                    onClick={() => handleOpenTransfer(row)}
                >
                    Transfer
                </Button>
            )
        }
    ];

    const scheduleColumns = [
        { header: 'Subject', accessor: 'subject_code' },
        { 
            header: 'Professor', 
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{row.professor_name || 'TBA'}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-black">{row.component_type}</span>
                </div>
            )
        },
        { 
            header: 'Schedule', 
            render: (row) => row.days?.length > 0 && row.start_time && row.end_time ? (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-700">{row.days.join('')}</span>
                    <span className="text-[10px] font-medium text-slate-500">
                        {row.start_time.substring(0, 5)} - {row.end_time.substring(0, 5)}
                    </span>
                </div>
            ) : <span className="text-slate-400 italic">TBA</span>
        },
        { header: 'Room', render: (row) => row.room_name || <span className="text-slate-400 italic">TBA</span> }
    ];

    const sectionColumns = [
        { 
            header: 'Section Name', 
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{row.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-black">{row.program_code} - Year {row.year_level}</span>
                </div>
            )
        },
        { 
            header: 'Session', 
            render: (row) => (
                <Badge variant={row.session === 'AM' ? 'info' : 'warning'} className="text-[10px]">
                    {row.session}
                </Badge>
            )
        },
        { 
            header: 'Students', 
            render: (row) => (
                <div className="flex items-center gap-2">
                    <span className="font-bold">{row.student_count}</span>
                    <span className="text-slate-400">/ {row.target_students}</span>
                </div>
            )
        },
        { 
            header: 'Status', 
            render: (row) => (
                row.scheduling_status === 'FULL' ? (
                    <Badge variant="success">Fully Scheduled</Badge>
                ) : row.scheduling_status === 'PARTIAL' ? (
                    <Badge variant="warning">Partially Scheduled</Badge>
                ) : (
                    <Badge variant="error">Unscheduled</Badge>
                )
            )
        },
        {
            header: 'Actions',
            align: 'right',
            render: (row) => (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    icon={<ChevronRight size={16} />}
                    onClick={() => handleOpenDetails(row)}
                >
                    Details
                </Button>
            )
        }
    ];

    return (
        <div className="section-management-container">
            <div className="flex items-center gap-4 mb-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/program-head')} icon={<ArrowLeft size={16} />}>
                    Back
                </Button>
            </div>

            <PageHeader 
                title={`${currentProgram.code} Sections`}
                description={`Managing schedules and students for ${currentProgram.name}`}
                badge={<Badge variant="primary">{activeTerm?.code}</Badge>}
                actions={
                    <div className="flex gap-4">
                        {headedPrograms.length > 1 && (
                            <Select
                                placeholder="Switch Program"
                                value={currentProgram.id}
                                onChange={(e) => navigate(`/program-head/sections?program_id=${e.target.value}`)}
                                options={headedPrograms.map(p => ({ value: p.id, label: p.code }))}
                                className="min-w-[120px]"
                            />
                        )}
                        <Button variant="ghost" className="bg-white border border-slate-200" icon={<RefreshCw size={18} />} onClick={fetchData}>
                            Refresh
                        </Button>
                    </div>
                }
            />

            <div className="mt-6">
                {sections.length > 0 ? (
                    <Card className="p-0 overflow-hidden">
                        <Table 
                            columns={sectionColumns} 
                            data={sections} 
                            onRowClick={handleOpenDetails}
                        />
                    </Card>
                ) : (
                    <Card className="flex flex-col items-center justify-center py-20 bg-slate-50/50 border-dashed">
                        <LayoutGrid size={48} className="text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-600 uppercase tracking-wider">No Sections Found</h3>
                        <p className="text-slate-500 mt-2">Sections for this program haven't been generated yet.</p>
                    </Card>
                )}
            </div>

            <Modal 
                isOpen={isDetailsOpen} 
                onClose={() => setIsDetailsOpen(false)} 
                title={`${selectedSection?.name} Details`}
                size="lg"
            >
                <Tabs 
                    activeTab={modalTab}
                    onTabChange={setModalTab}
                    tabs={[
                        { id: 'students', label: 'Student Roster', icon: Users },
                        { id: 'schedule', label: 'Class Schedule', icon: Clock }
                    ]}
                    className="mb-6"
                />

                <div className="min-h-[300px]">
                    {modalTab === 'students' ? (
                        <Table columns={rosterColumns} data={roster} loading={detailsLoading} />
                    ) : (
                        <Table columns={scheduleColumns} data={schedules} loading={detailsLoading} />
                    )}
                </div>

                <div className="flex justify-end mt-8">
                    <Button variant="ghost" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                </div>
            </Modal>

            <Modal
                isOpen={isTransferOpen}
                onClose={() => setIsTransferOpen(false)}
                title="Transfer Student"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student</div>
                        <div className="font-bold text-slate-800 uppercase">{studentToTransfer?.student_name}</div>
                        <div className="text-xs text-slate-500">{studentToTransfer?.student_idn}</div>
                    </div>

                    <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 flex gap-3 mb-6">
                        <Users size={18} className="shrink-0" />
                        <p className="text-[10px] font-bold leading-relaxed uppercase">
                            As Program Head, you can transfer students regardless of section capacity.
                        </p>
                    </div>

                    <Select 
                        label="Select Target Section"
                        placeholder="Choose a section..."
                        value={targetSectionId}
                        onChange={(e) => setTargetSectionId(e.target.value)}
                        options={sections
                            .filter(s => s.id !== selectedSection?.id && s.year_level === selectedSection?.year_level)
                            .map(s => ({
                                value: s.id,
                                label: `${s.name} (${s.student_count}/${s.target_students})`
                            }))
                        }
                    />

                    <div className="flex gap-3 justify-end mt-8">
                        <Button variant="ghost" onClick={() => setIsTransferOpen(false)}>Cancel</Button>
                        <Button variant="primary" loading={isTransferring} onClick={handleConfirmTransfer}>Complete Transfer</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SectionManagement;
