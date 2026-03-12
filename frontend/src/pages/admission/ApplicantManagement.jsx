import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Eye, 
  Calendar,
  Clock,
  Filter
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/shared/PageHeader';
import SearchBar from '../../components/shared/SearchBar';
import { useToast } from '../../components/ui/Toast';
import { studentsApi } from '../../api/students';
import ApplicantDetailsModal from './components/ApplicantDetailsModal';

const ApplicantManagement = () => {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  const fetchApplicants = async () => {
    try {
      setLoading(true);
      const res = await studentsApi.getStudents({ status: 'APPLICANT', search: searchQuery });
      setApplicants(res.data.results || res.data);
    } catch (err) {
      showToast('error', 'Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [searchQuery]);

  const columns = [
    { 
      header: 'Applicant Name', 
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800">{row.user.first_name} {row.user.last_name}</div>
          <div className="text-xs text-slate-400">{row.user.email}</div>
        </div>
      )
    },
    { header: 'Program', render: (row) => row.program_details?.code || 'N/A' },
    { 
      header: 'Type', 
      render: (row) => (
        <Badge variant={row.student_type === 'FRESHMAN' ? 'info' : 'warning'}>
          {row.student_type}
        </Badge>
      )
    },
    { 
      header: 'Submitted', 
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock size={14} />
          {new Date(row.created_at).toLocaleDateString()}
        </div>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Button 
          variant="ghost" 
          size="sm" 
          icon={<Eye size={16} />} 
          onClick={() => { setSelectedApplicant(row); setModalOpen(true); }}
        >
          Review
        </Button>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Applicant Management"
        description="Review and approve new student applications"
        actions={
          <Badge variant="neutral" className="text-sm px-3 py-1">
             {applicants.length} Pending Applications
          </Badge>
        }
      />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <SearchBar 
            placeholder="Search by name or email..." 
            onSearch={setSearchQuery}
          />
        </div>
      </div>

      <Card padding="0">
        <Table 
          columns={columns} 
          data={applicants} 
          loading={loading} 
          emptyMessage="No pending applications found."
        />
      </Card>

      <ApplicantDetailsModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={fetchApplicants} 
        applicant={selectedApplicant} 
      />
    </div>
  );
};

export default ApplicantManagement;
