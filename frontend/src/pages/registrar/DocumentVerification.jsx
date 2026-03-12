import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  Search, 
  ClipboardCheck,
  Filter,
  UserCheck
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { studentsApi } from '../../api/students';
import RegistrarVerificationModal from './components/RegistrarVerificationModal';
import PageHeader from '../../components/shared/PageHeader';
import SearchBar from '../../components/shared/SearchBar';
import './DocumentVerification.css';

const DocumentVerification = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('APPROVED');
  const { addToast } = useToast();

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await studentsApi.getStudents({ 
        status: statusFilter, 
        search: searchQuery,
        page_size: 100
      });
      setStudents(res.data.results || res.data);
    } catch (err) {
      addToast('error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchQuery, statusFilter]);

  const columns = [
    { 
      header: 'Student', 
      render: (row) => (
        <div className="py-1">
          <div className="font-bold text-slate-800">{row.user.first_name} {row.user.last_name}</div>
          <div className="text-xs text-slate-500 font-mono">IDN: {row.idn}</div>
        </div>
      )
    },
    { header: 'Program', render: (row) => <div className="font-medium text-slate-600">{row.program_details?.code || 'N/A'}</div> },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.status === 'ENROLLED' ? 'success' : 'info'}>
          {row.status}
        </Badge>
      )
    },
    { 
      header: 'Docs Submitted', 
      render: (row) => {
        const submittedCount = Object.values(row.document_checklist || {}).filter(d => d.submitted).length;
        const totalCount = Object.keys(row.document_checklist || {}).length;
        return (
          <div className="flex flex-col gap-1">
            <div className="text-xs font-bold text-slate-700">{submittedCount}/{totalCount}</div>
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div 
                 className={`h-full transition-all ${submittedCount === totalCount ? 'bg-green-500' : 'bg-blue-400'}`} 
                 style={{ width: `${(submittedCount / (totalCount || 1)) * 100}%` }}
               />
            </div>
          </div>
        );
      }
    },
    { 
      header: 'Docs Verified', 
      render: (row) => {
        const verifiedCount = Object.values(row.document_checklist || {}).filter(d => d.verified).length;
        const totalCount = Object.keys(row.document_checklist || {}).length;
        return (
          <div className="flex flex-col gap-1">
            <div className="text-xs font-bold text-slate-700">{verifiedCount}/{totalCount}</div>
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div 
                 className={`h-full transition-all ${verifiedCount === totalCount ? 'bg-blue-600' : 'bg-indigo-400'}`} 
                 style={{ width: `${(verifiedCount / (totalCount || 1)) * 100}%` }}
               />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:bg-primary-light font-bold"
          icon={<ClipboardCheck size={16} />} 
          onClick={() => { setSelectedStudent(row); setModalOpen(true); }}
        >
          Verify Docs
        </Button>
      )
    }
  ];

  return (
    <div className="verification-page-container animate-in fade-in duration-500">
      <PageHeader 
        title="Document Verification" 
        description="Registrar quality check and enrollment finalization" 
      />

      <div className="filter-card">
        <div className="filter-row">
          <div className="filter-label">
            <Filter size={18} />
            <span>Filter & Search</span>
          </div>
          
          <div className="filter-group">
            <div className="search-wrapper">
              <SearchBar 
                placeholder="Search name or IDN..." 
                onSearch={setSearchQuery}
              />
            </div>
            <div className="status-wrapper">
              <Select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'APPROVED', label: 'Approved by Admission' },
                  { value: 'ENROLLED', label: 'Officially Enrolled' },
                  { value: '', label: 'All Students' }
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <Card padding="0" className="overflow-hidden shadow-md border-slate-100">
        <Table 
          columns={columns} 
          data={students} 
          loading={loading} 
          emptyMessage="No students found matching current filters."
        />
      </Card>

      <RegistrarVerificationModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={fetchStudents} 
        student={selectedStudent} 
      />
    </div>
  );
};

export default DocumentVerification;
