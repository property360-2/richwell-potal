import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  User, 
  MapPin, 
  GraduationCap,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { studentsApi } from '../../../api/students';
import Input from '../../../components/ui/Input';
import { Copy, Printer } from 'lucide-react';

const ApplicantDetailsModal = ({ isOpen, onClose, onSuccess, applicant }) => {
  const [checklist, setChecklist] = useState({});
  const [approving, setApproving] = useState(false);
  const [monthlyCommitment, setMonthlyCommitment] = useState('');
  const [approvedCredentials, setApprovedCredentials] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (applicant) {
      setChecklist(applicant.document_checklist || {});
      setApprovedCredentials(null);
      setMonthlyCommitment('');
    }
  }, [applicant, isOpen]);

  const toggleDocument = (key) => {
    setChecklist(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        submitted: !prev[key].submitted
      }
    }));
  };

  const handleUpdateChecklist = async () => {
    try {
      await studentsApi.updateStudent(applicant.id, { document_checklist: checklist });
      showToast('success', 'Document checklist updated');
    } catch (err) {
      showToast('error', 'Failed to update checklist');
    }
  };

  const handleApprove = async () => {
    if (!monthlyCommitment) {
      showToast('error', 'Please enter the monthly commitment amount');
      return;
    }
    if (!window.confirm('Approve this applicant? This will generate their Student ID and account.')) return;
    
    try {
      setApproving(true);
      // First save the checklist to be sure
      await studentsApi.updateStudent(applicant.id, { document_checklist: checklist });
      const res = await studentsApi.approve(applicant.id, { monthly_commitment: monthlyCommitment });
      
      setApprovedCredentials(res.data.credentials);
      showToast('success', `Applicant approved! IDN: ${res.data.credentials.idn}`);
      onSuccess();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to approve applicant');
    } finally {
      setApproving(false);
    }
  };

  if (!applicant) return null;

  if (approvedCredentials) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Account Created Successfully" size="md">
        <div className="text-center py-6 space-y-6">
          <div className="inline-flex items-center justify-center p-4 bg-green-50 text-green-600 rounded-full">
            <CheckCircle2 size={48} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Application Approved!</h3>
            <p className="text-sm text-slate-500 mt-2">The following student account has been generated. Please provide these credentials to the student.</p>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Student ID (IDN)</span>
              <span className="text-2xl font-mono font-bold text-primary select-all">{approvedCredentials.idn}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Default Password</span>
              <span className="text-2xl font-mono font-bold text-slate-700 select-all">{approvedCredentials.password}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button variant="primary" className="w-full" onClick={() => { window.print(); }} icon={<Printer size={18} />}>
              Print Credentials
            </Button>
            <Button variant="ghost" className="w-full" onClick={onClose}>
              Close and Refresh List
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Applicant Review"
      size="xl"
    >
      <div className="space-y-8">
        {/* Header Info */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl">
                {applicant.user.first_name[0]}{applicant.user.last_name[0]}
             </div>
             <div>
                <h3 className="text-lg font-bold text-slate-800">{applicant.user.first_name} {applicant.user.last_name}</h3>
                <p className="text-sm text-slate-500">{applicant.user.email}</p>
             </div>
           </div>
           <Badge variant="warning">Pending Admission</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Left Column: Details */}
           <div className="space-y-6">
              <section>
                 <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    <User size={16} /> Personal Info
                 </h4>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                       <span className="block text-slate-400">Gender</span>
                       <span className="font-medium">{applicant.gender}</span>
                    </div>
                    <div>
                       <span className="block text-slate-400">Birthdate</span>
                       <span className="font-medium">{applicant.date_of_birth}</span>
                    </div>
                    <div>
                       <span className="block text-slate-400">Municipality</span>
                       <span className="font-medium">{applicant.address_municipality}</span>
                    </div>
                    <div>
                       <span className="block text-slate-400">Contact</span>
                       <span className="font-medium">{applicant.contact_number}</span>
                    </div>
                 </div>
              </section>

              <section>
                 <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    <GraduationCap size={16} /> Program & Type
                 </h4>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="col-span-2">
                       <span className="block text-slate-400">Preferred Program</span>
                       <span className="font-medium">{applicant.program_details?.code} - {applicant.program_details?.name}</span>
                    </div>
                    <div>
                       <span className="block text-slate-400">Curriculum</span>
                       <span className="font-medium">{applicant.curriculum_details?.version_name}</span>
                    </div>
                    <div>
                       <span className="block text-slate-400">Student Type</span>
                       <span className="font-medium">{applicant.student_type}</span>
                    </div>
                 </div>
              </section>

              <section className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                 <h4 className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider mb-4">
                    <ShieldCheck size={16} /> Admission Step
                 </h4>
                 <Input 
                   label="Monthly Payment Commitment" 
                   type="number" 
                   placeholder="e.g. 5000"
                   value={monthlyCommitment}
                   onChange={(e) => setMonthlyCommitment(e.target.value)}
                   helperText="This amount is required to approve the application."
                 />
              </section>
           </div>

           {/* Right Column: Document Checklist */}
           <section className="bg-slate-50 p-6 rounded-lg border border-slate-100">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                 <FileText size={16} /> Document Checklist
              </h4>
              <div className="space-y-2">
                 {Object.keys(checklist).map(key => (
                    <label 
                      key={key} 
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${checklist[key].submitted ? 'bg-green-50 text-green-700' : 'hover:bg-slate-200 text-slate-600'}`}
                    >
                       <div className="flex items-center gap-2 text-xs font-medium uppercase">
                          {checklist[key].submitted ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 border border-slate-300 rounded" />}
                          {key.replace('_', ' ')}
                       </div>
                       <input 
                         type="checkbox" 
                         checked={checklist[key].submitted} 
                         onChange={() => toggleDocument(key)}
                         className="hidden"
                       />
                    </label>
                 ))}
              </div>
           </section>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
          <Button variant="ghost" onClick={handleUpdateChecklist}>
            Save Checklist Only
          </Button>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button 
              variant="primary" 
              onClick={handleApprove} 
              loading={approving}
              icon={<ShieldCheck size={18} />}
              disabled={!monthlyCommitment}
            >
              Approve & Create Account
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ApplicantDetailsModal;
