import React, { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
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

  const filteredSubjects = subjects
    .filter(subject => 
      (subject?.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (subject?.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aSelected = selectedIds.has(a.id);
      const bSelected = selectedIds.has(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

  if (!professor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Subjects to Professor"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Info size={20} />
            </div>
            <div>
              <h4 className="font-black text-slate-800 uppercase text-xs tracking-tight">
                {professor.user.first_name} {professor.user.last_name}
              </h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {professor.department} • {professor.employee_id}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="font-bold text-slate-400 hover:text-slate-600">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} className="px-6 font-black uppercase text-[10px] shadow-lg shadow-primary/20">
              Save Assignments
            </Button>
          </div>
        </div>

        <Input
          placeholder="Search subjects by code or name..."
          icon={Search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[450px] shadow-sm bg-white">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Select</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-32">Code</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Description</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-center">Units</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold uppercase tracking-tighter">Loading subjects...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-12 text-center text-slate-400 italic text-sm">
                      No subjects found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map(subject => {
                    const isSelected = selectedIds.has(subject.id);
                    return (
                      <tr 
                        key={subject.id} 
                        onClick={() => handleToggle(subject.id)}
                        className={`group border-b border-slate-50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-6 py-3 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary/20 transition-all cursor-pointer"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggle(subject.id);
                            }}
                          />
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-sm font-black ${isSelected ? 'text-primary' : 'text-slate-700'}`}>
                            {subject.code}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-sm font-bold text-slate-600 line-clamp-1">{subject.description}</div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <Badge variant="neutral" className="text-[10px] font-black">{subject.total_units} U</Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Selection: <strong className="text-slate-900">{selectedIds.size}</strong> Subjects Total
            </span>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default ProfessorSubjectModal;
