import React, { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { facultyApi } from '../../../api/faculty';
import { academicsApi } from '../../../api/academics';
import { useToast } from '../../../components/ui/Toast';
import { Search, Info } from 'lucide-react';

const ProfessorSubjectModal = ({ isOpen, onClose, professor, onSuccess }) => {
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Set of subject IDs that are selected
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && professor) {
      // Pre-select subjects already assigned to the professor
      const initialIds = new Set(professor.assigned_subjects.map(ps => ps.subject));
      setSelectedIds(initialIds);
    } else {
      setSelectedIds(new Set());
    }
  }, [isOpen, professor]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await academicsApi.getSubjects({ page_size: 100 });
      setSubjects(res.data.results || []);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      showToast('Failed to load subjects.', 'error');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await facultyApi.assignSubjects(professor.id, Array.from(selectedIds));
      showToast('Subjects successfully assigned to professor.', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to assign subjects:', error);
      showToast('An error occurred while assigning subjects.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredSubjects = subjects.filter(subject => 
    (subject?.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (subject?.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (!professor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Subjects to Professor"
    >
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-lg flex gap-3 border border-slate-200">
          <Info className="text-slate-500 mt-0.5 shrink-0" size={20} />
          <div>
            <h4 className="font-medium text-slate-800">
              {professor.user.first_name} {professor.user.last_name}
            </h4>
            <p className="text-sm text-slate-500">
              {professor.department} • {professor.employee_id}
            </p>
          </div>
        </div>

        <Input
          placeholder="Search subjects by code or name..."
          icon={Search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[400px] shadow-sm">
          <div className="bg-slate-50 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 grid grid-cols-12 gap-2 sticky top-0 z-10">
            <div className="col-span-1 text-center">Select</div>
            <div className="col-span-3">Code</div>
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-center">Units</div>
          </div>
          
          <div className="overflow-y-auto flex-1 bg-white">
            {loading ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Loading subjects...</span>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="p-12 text-center text-slate-500 italic">No subjects found matching your search.</div>
            ) : (
              filteredSubjects.map(subject => (
                <label 
                  key={subject.id} 
                  className={`grid grid-cols-12 gap-2 px-6 py-3.5 cursor-pointer transition-colors border-b last:border-0 items-center ${
                    selectedIds.has(subject.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="col-span-1 flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary/20 transition-all cursor-pointer"
                      checked={selectedIds.has(subject.id)}
                      onChange={() => handleToggle(subject.id)}
                    />
                  </div>
                  <div className="col-span-3 flex items-center font-semibold text-slate-900 text-sm">
                    {subject.code}
                  </div>
                  <div className="col-span-6 flex items-center text-slate-600 text-sm leading-tight">
                    {subject.description}
                  </div>
                  <div className="col-span-2 flex items-center justify-center font-medium text-slate-500 text-sm">
                    {subject.total_units}
                  </div>
                </label>
              ))
            )}
          </div>
          
          <div className="bg-slate-50 p-3 border-t border-slate-200 flex justify-between items-center text-sm">
            <span className="text-slate-600">
              <strong className="text-slate-900">{selectedIds.size}</strong> subjects selected
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving Assignments...' : 'Save Assignments'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProfessorSubjectModal;
