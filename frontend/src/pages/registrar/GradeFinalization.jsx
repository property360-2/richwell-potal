import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, CheckCircle, ShieldAlert, FileCheck, Layers, Filter } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import Tabs from '../../components/ui/Tabs';
import { gradesApi } from '../../api/grades';
import { termsApi } from '../../api/terms';
import PageHeader from '../../components/shared/PageHeader';
import SearchBar from '../../components/shared/SearchBar';
import './GradeFinalization.css';

const GradeFinalization = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'resolutions'
  const [loading, setLoading] = useState(false);
  const [activeTerm, setActiveTerm] = useState(null);
  const [pendingSections, setPendingSections] = useState([]);
  const [resolutions, setResolutions] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [roster, setRoster] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const termRes = await termsApi.getActiveTerm();
      const term = termRes.data?.results?.[0] || termRes.data?.[0];
      
      if (!term) {
        setPendingSections([]);
        setResolutions([]);
        return;
      }

      setActiveTerm(term);

      if (activeTab === 'pending') {
        const res = await gradesApi.getGrades({ 
          term: term.id, 
          finalized_at__isnull: 'true',
          grade_status__isnull: 'false' // grades already entered
        });
        
        // Group by section and subject
        const grouped = {};
        const grades = res.data?.results || [];
        grades.forEach(g => {
            const key = `${g.section}-${g.subject}`;
            if (!grouped[key]) {
                grouped[key] = {
                    section_id: g.section,
                    section_name: g.section_details?.name || `Section ${g.section}`,
                    subject_id: g.subject,
                    subject_code: g.subject_details?.code,
                    subject_name: g.subject_details?.name,
                    pending_count: 0
                };
            }
            grouped[key].pending_count++;
        });
        setPendingSections(Object.values(grouped));
      } else {
        const res = await gradesApi.getGrades({ 
           grade_status: 'INC',
           is_resolution_requested: 'true',
           is_resolution_approved: 'false'
        });
        setResolutions(res.data?.results || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      addToast('error', 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRoster = async (section) => {
    setSelectedSection(section);
    try {
      setLoading(true);
      const res = await gradesApi.getGrades({ 
        term: activeTerm.id,
        section: section.section_id,
        subject: section.subject_id
      });
      setRoster(res.data.results);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setLoading(true);
      await gradesApi.finalizeGrades({
        term: activeTerm.id,
        subject: selectedSection.subject_id,
        section: selectedSection.section_id
      });
      addToast('success', 'Grades finalized successfully!');
      setSelectedSection(null);
      fetchInitialData();
    } catch (error) {
      addToast('error', error.response?.data?.error || 'Finalization failed.');
    } finally {
      setLoading(false);
    }
  };

  const pendingColumns = [
    {
      header: 'Subject',
      render: (row) => (
        <div className="py-1">
          <div className="font-bold text-slate-800">{row.subject_code}</div>
          <div className="text-xs text-slate-500">{row.subject_name}</div>
        </div>
      )
    },
    { header: 'Section', accessor: 'section_name' },
    { 
       header: 'Pending Grades', 
       render: (row) => <Badge variant="info">{row.pending_count} Students</Badge>
    },
    {
       header: 'Action',
       align: 'right',
       render: (row) => (
         <Button variant="ghost" size="sm" onClick={() => handleOpenRoster(row)} icon={<ChevronRight size={16} />}>
            Review
         </Button>
       )
    }
  ];

  const resolutionColumns = [
    {
      header: 'Student',
      render: (row) => (
        <div>
          <div className="font-bold">{row.student_name}</div>
          <div className="text-xs text-slate-500 font-mono">{row.student_idn}</div>
        </div>
      )
    },
    { header: 'Subject', render: (row) => row.subject_details?.code },
    { 
        header: 'Reason', 
        render: (row) => <div className="max-w-xs text-xs italic text-slate-600 truncate" title={row.rejection_reason}>{row.rejection_reason || 'No reason provided'}</div> 
    },
    {
        header: 'Actions',
        align: 'right',
        render: (row) => (
            <Button 
              size="sm" 
              onClick={async () => {
                try {
                  setLoading(true);
                  await gradesApi.registrarApproveResolution(row.id);
                  addToast('info', 'Resolution request has been unlocked for the professor.');
                  fetchInitialData();
                } catch (e) {
                  addToast('error', 'Action failed.');
                } finally {
                  setLoading(false);
                }
              }}
            >
                Approve Request
            </Button>
        )
    }
  ];

  return (
    <div className="grade-finalization-container p-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Grade Management Dashboard"
        description={`Review and finalize student grades for ${activeTerm?.name || 'Active Term'}`}
        badge={<Layers className="text-primary" size={32} />}
        actions={
          <Tabs 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={[
              { id: 'pending', label: 'Finalization Queue' },
              { id: 'resolutions', label: 'Resolution Requests' }
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   {activeTab === 'pending' ? <FileCheck className="text-blue-500" /> : <ShieldAlert className="text-amber-500" />}
                   <h2 className="font-bold text-slate-800 uppercase tracking-wider text-sm">
                      {activeTab === 'pending' ? 'Sections Pending Finalization' : 'INC Resolution Queue'}
                   </h2>
                </div>
                <div className="flex items-center gap-2">
                   <SearchBar 
                     placeholder="Search..." 
                     onSearch={setSearchTerm}
                   />
                </div>
            </div>
            <Table 
              columns={activeTab === 'pending' ? pendingColumns : resolutionColumns}
              data={activeTab === 'pending' ? pendingSections : resolutions}
              loading={loading}
              emptyMessage={activeTab === 'pending' ? "No sections found with pending grades." : "No active resolution requests."}
            />
          </Card>
      </div>

      {/* Roster Modal */}
      {selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <Card className="w-full max-w-4xl shadow-2xl h-[80vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <Badge variant="info">{selectedSection.section_name}</Badge>
                        <h3 className="text-xl font-black text-slate-900 mt-1 uppercase leading-none">
                            {selectedSection.subject_name}
                        </h3>
                    </div>
                    <Button variant="ghost" onClick={() => setSelectedSection(null)}>Close</Button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    <Table 
                       columns={[
                         { header: 'Student', render: (r) => <div className="font-medium">{r.student_name}</div>},
                         { header: 'Midterm', accessor: 'midterm_grade'},
                         { header: 'Final', accessor: 'final_grade'},
                         { header: 'Status', render: (r) => <Badge variant={r.grade_status === 'PASSED' ? 'success' : 'neutral'}>{r.grade_status_display}</Badge>}
                       ]}
                       data={roster}
                       loading={loading}
                    />
                </div>
                <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-500 text-sm italic">
                        <CheckCircle size={16} className="text-emerald-500" />
                        Finalizing will lock these grades permanently.
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setSelectedSection(null)}>Cancel</Button>
                        <Button variant="primary" size="lg" icon={<Layers size={20} />} onClick={handleFinalize}>
                            Finalize All Grades
                        </Button>
                    </div>
                </div>
           </Card>
        </div>
      )}
    </div>
  );
};

export default GradeFinalization;
