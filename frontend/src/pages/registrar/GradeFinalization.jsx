import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'resolutions'
  const [loading, setLoading] = useState(false);
  const [activeTerm, setActiveTerm] = useState(null);
  const [pendingSections, setPendingSections] = useState([]);
  const [resolutions, setResolutions] = useState([]);
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

  const handleOpenRoster = (section) => {
    navigate(`/registrar/grades/review/${activeTerm.id}/${section.section_id}/${section.subject_id}`);
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
    </div>
  );
};

export default GradeFinalization;
