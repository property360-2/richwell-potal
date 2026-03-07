import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Edit2,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { termsApi } from '../../api/terms';
import TermModal from './components/TermModal';

const TermManagement = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const res = await termsApi.getTerms({ search: searchQuery });
      setTerms(res.data.results || res.data);
    } catch (err) {
      showToast('error', 'Failed to load academic terms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, [searchQuery]);

  const handleActivate = async (id) => {
    if (!window.confirm('Activating this term will deactivate all others. Continue?')) return;
    try {
      await termsApi.activateTerm(id);
      showToast('success', 'Term activated successfully');
      fetchTerms();
    } catch (err) {
      showToast('error', 'Failed to activate term');
    }
  };

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Academic Year', accessor: 'academic_year' },
    { header: 'Semester', accessor: 'semester_display' },
    { 
      header: 'Start/End', 
      render: (row) => (
        <div className="text-sm">
          <div>{row.start_date}</div>
          <div className="text-slate-400">{row.end_date}</div>
        </div>
      )
    },
    { 
      header: 'Status',
      render: (row) => row.is_active ? 
        <Badge variant="success" icon={<CheckCircle2 size={12} />}>Active</Badge> : 
        <Badge variant="neutral">Inactive</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
           {!row.is_active && (
             <Button 
               variant="ghost" 
               size="sm" 
               className="text-success-600" 
               icon={<CheckCircle2 size={16} />} 
               onClick={() => handleActivate(row.id)}
               title="Activate Term"
             />
           )}
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<Edit2 size={16} />} 
            onClick={() => { setEditingTerm(row); setModalOpen(true); }} 
          />
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Term Management</h1>
          <p className="text-slate-500">Configure academic years and enrollment periods</p>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => { setEditingTerm(null); setModalOpen(true); }}>
          New Term
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input 
            placeholder="Search academic year or code..." 
            icon={<Search size={18} />} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card padding="0">
        <Table columns={columns} data={terms} loading={loading} />
      </Card>

      <TermModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={fetchTerms} 
        term={editingTerm} 
      />
    </div>
  );
};

export default TermManagement;
