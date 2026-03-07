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

const DocumentVerification = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('APPROVED');
  const { showToast } = useToast();

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await studentsApi.getStudents({ 
        status: statusFilter, 
        search: searchQuery 
      });
      setStudents(res.data.results || res.data);
    } catch (err) {
      showToast('error', 'Failed to load students');
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
        <div>
          <div className="font-bold text-slate-800">{row.user.first_name} {row.user.last_name}</div>
          <div className="text-xs text-slate-400">IDN: {row.idn}</div>
        </div>
      )
    },
    { header: 'Program', render: (row) => row.program_details?.code || 'N/A' },
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
          <div className="text-xs font-medium">
            <span className={submittedCount === totalCount ? 'text-green-600' : 'text-slate-500'}>
              {submittedCount}/{totalCount} items
            </span>
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
          icon={<ClipboardCheck size={16} />} 
          onClick={() => { setSelectedStudent(row); setModalOpen(true); }}
        >
          Verify Docs
        </Button>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Document Verification</h1>
          <p className="text-slate-500">Registrar quality check and enrollment finalization</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <Input 
            label="Search Student"
            placeholder="Search name or IDN..." 
            icon={<Search size={18} />} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select 
            label="Filter Status"
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

      <Card padding="0">
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
