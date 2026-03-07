import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  FileCheck,
  User, 
  GraduationCap,
  Banknote
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { studentsApi } from '../../../api/students';

const RegistrarVerificationModal = ({ isOpen, onClose, onSuccess, student }) => {
  const [checklist, setChecklist] = useState({});
  const [updating, setUpdating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (student) {
      setChecklist(student.document_checklist || {});
    }
  }, [student, isOpen]);

  const toggleVerify = (key) => {
    setChecklist(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        verified: !prev[key].verified
      }
    }));
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      await studentsApi.updateStudent(student.id, { document_checklist: checklist });
      showToast('success', 'Verification updated');
      onSuccess();
    } catch (err) {
      showToast('error', 'Failed to update verification');
    } finally {
      setUpdating(false);
    }
  };

  const handleFinalizeEnrollment = async () => {
    if (!window.confirm('Finalize enrollment for this student?')) return;
    try {
      setUpdating(true);
      await studentsApi.updateStudent(student.id, { 
        document_checklist: checklist,
        status: 'ENROLLED'
      });
      showToast('success', 'Student successfully ENROLLED');
      onSuccess();
      onClose();
    } catch (err) {
      showToast('error', 'Failed to finalize enrollment');
    } finally {
      setUpdating(false);
    }
  };

  if (!student) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Registrar Document Verification"
      size="xl"
    >
      <div className="space-y-8">
        <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-100">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                {student.user.first_name[0]}{student.user.last_name[0]}
             </div>
             <div>
                <h3 className="text-lg font-bold text-slate-800">{student.user.first_name} {student.user.last_name}</h3>
                <p className="text-sm text-slate-500">IDN: {student.idn}</p>
             </div>
           </div>
           <Badge variant={student.status === 'ENROLLED' ? 'success' : 'info'}>
             {student.status}
           </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <section>
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                 <User size={16} /> Student Details
              </h4>
              <div className="space-y-4 text-sm">
                 <div className="p-3 bg-white rounded border border-slate-100">
                    <span className="block text-slate-400 text-xs mb-1">Program</span>
                    <span className="font-semibold">{student.program_details?.name}</span>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded border border-slate-100">
                       <span className="block text-slate-400 text-xs mb-1">Type</span>
                       <span className="font-semibold">{student.student_type}</span>
                    </div>
                    <div className="p-3 bg-white rounded border border-slate-100">
                       <span className="block text-slate-400 text-xs mb-1">Curriculum</span>
                       <span className="font-semibold">{student.curriculum_details?.version_name}</span>
                    </div>
                 </div>
                 <div className="p-3 bg-primary/5 rounded border border-primary/20">
                    <div className="flex items-center gap-2 text-primary mb-1">
                       <Banknote size={14} />
                       <span className="text-xs font-bold uppercase">Monthly Commitment</span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                       ₱{student.latest_enrollment?.monthly_commitment?.toLocaleString() || '0'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">Recorded by Admission during approval</p>
                 </div>
              </div>
           </section>

           <section className="bg-white p-6 rounded-lg border border-slate-200">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                 <FileCheck size={16} /> Verification Layer
              </h4>
              <div className="space-y-2">
                 {Object.keys(checklist).map(key => (
                    <div 
                      key={key} 
                      className={`flex items-center justify-between p-3 rounded border transition-all ${checklist[key].verified ? 'bg-green-50 border-green-100 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                       <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase">{key.replace('_', ' ')}</span>
                          <span className="text-[10px]">{checklist[key].submitted ? 'Submitted ✓' : 'Pending Submission'}</span>
                       </div>
                       <Button 
                         variant={checklist[key].verified ? 'primary' : 'ghost'} 
                         size="sm" 
                         className="h-8"
                         disabled={!checklist[key].submitted}
                         onClick={() => toggleVerify(key)}
                       >
                          {checklist[key].verified ? 'Verified' : 'Verify'}
                       </Button>
                    </div>
                 ))}
              </div>
           </section>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
          <Button variant="ghost" onClick={handleUpdate} loading={updating}>
            Save Changes
          </Button>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            {student.status !== 'ENROLLED' && (
              <Button 
                variant="primary" 
                onClick={handleFinalizeEnrollment} 
                loading={updating}
                icon={<ShieldCheck size={18} />}
              >
                Mark as Enrolled
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RegistrarVerificationModal;
