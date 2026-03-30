import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  User, 
  MapPin, 
  Mail,
  GraduationCap,
  ShieldCheck,
  Calendar,
  Check
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
  const [isAdmitting, setIsAdmitting] = useState(false);
  const [monthlyCommitment, setMonthlyCommitment] = useState('');
  const [admissionCredentials, setAdmissionCredentials] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (applicant) {
      setChecklist(applicant.document_checklist || {});
      setAdmissionCredentials(null);
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
      addToast('success', 'Document checklist updated');
    } catch (err) {
      addToast('error', 'Failed to update checklist');
    }
  };

  const handleAdmit = async () => {
    if (!monthlyCommitment) {
      addToast('error', 'Please enter the monthly commitment amount');
      return;
    }
    if (!window.confirm('Admit this applicant? This will generate their Student ID and account.')) return;
    
    try {
      setIsAdmitting(true);
      // First save the checklist to be sure
      await studentsApi.updateStudent(applicant.id, { document_checklist: checklist });
      const res = await studentsApi.admit(applicant.id, { monthly_commitment: monthlyCommitment });
      
      setAdmissionCredentials(res.data.credentials);
      addToast('success', `Student admitted! IDN: ${res.data.credentials.idn}`);
      onSuccess();
    } catch (err) {
      addToast('error', err.response?.data?.error || 'Failed to admit student');
    } finally {
      setIsAdmitting(false);
    }
  };

  const markAll = (submitted) => {
    setChecklist(prev => {
      const updated = {};
      Object.keys(prev).forEach(key => {
        updated[key] = { ...prev[key], submitted };
      });
      return updated;
    });
  };

  if (!applicant) return null;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    addToast('success', `${label} copied to clipboard`);
  };

  if (admissionCredentials) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Account Created Successfully" size="md">
        <div className="text-center py-6 space-y-6">
          <div className="inline-flex items-center justify-center p-4 bg-green-50 text-green-600 rounded-full">
            <CheckCircle2 size={48} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Student Admitted!</h3>
            <p className="text-sm text-slate-500 mt-2">The following student account has been generated. Please provide these credentials to the student.</p>
          </div>

          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Student ID (IDN)</span>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-mono font-bold text-primary select-all">{admissionCredentials.idn}</span>
                <button 
                  onClick={() => copyToClipboard(admissionCredentials.idn, 'Student ID')}
                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-white rounded-md transition-colors border border-transparent hover:border-slate-100"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-200 w-2/3 mx-auto"></div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Default Password</span>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-mono font-bold text-slate-700 select-all">{admissionCredentials.password}</span>
                <button 
                  onClick={() => copyToClipboard(admissionCredentials.password, 'Password')}
                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-white rounded-md transition-colors border border-transparent hover:border-slate-100"
                >
                  <Copy size={16} />
                </button>
              </div>
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
        {/* Enhanced Identity Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
          {/* Subtle Background Accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-hover text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
               {applicant.user.first_name[0]}{applicant.user.last_name[0]}
            </div>
            <div>
               <div className="flex items-center gap-3">
                 <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                   {applicant.user.first_name} {applicant.user.last_name}
                 </h3>
                 <Badge variant="warning" className="px-3 py-1 font-bold text-[10px] uppercase">Pending Admission</Badge>
               </div>
               <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                 <Mail size={14} className="text-slate-400" />
                 <span>{applicant.user.email}</span>
               </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 relative z-10">
            <div className="flex flex-col items-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</span>
              <span className="text-sm font-bold text-warning-light-contrast">Applicant</span>
            </div>
            <div className="flex flex-col items-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Applied</span>
              <span className="text-sm font-bold text-slate-700">{new Date(applicant.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left/Main Column: Information Summary */}
           <div className="lg:col-span-2 space-y-8">
              {/* Detailed Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors shadow-sm">
                   <h4 className="flex items-center gap-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.1em] mb-5 pb-3 border-b border-slate-50">
                      <User size={14} className="text-primary" /> Personal Information
                   </h4>
                   <div className="space-y-4">
                      <DataRow label="Gender" value={applicant.gender} />
                      <DataRow label="Birthdate" value={new Date(applicant.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                      <DataRow label="Municipality" value={applicant.address_municipality} />
                      <DataRow label="Contact" value={applicant.contact_number} />
                   </div>
                </section>

                <section className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors shadow-sm">
                   <h4 className="flex items-center gap-2 text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.1em] mb-5 pb-3 border-b border-slate-50">
                      <GraduationCap size={14} className="text-primary" /> Academic Profile
                   </h4>
                   <div className="space-y-4">
                      <div className="pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                         <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">Preferred Program</span>
                         <span className="block font-bold text-slate-700">{applicant.program_details?.code}</span>
                         <span className="text-xs text-slate-500 leading-tight block mt-0.5">{applicant.program_details?.name}</span>
                      </div>
                      <DataRow label="Curriculum" value={applicant.curriculum_details?.version_name || 'V1 (Auto)'} />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Student Type</span>
                        <Badge variant={applicant.student_type === 'FRESHMAN' ? 'info' : 'warning'} className="font-bold">{applicant.student_type}</Badge>
                      </div>
                   </div>
                </section>
              </div>

              {/* Admission Approval Step */}
              <section className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-3xl border border-primary/20 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                   <ShieldCheck size={80} />
                 </div>
                 
                 <div className="relative z-10">
                   <h4 className="flex items-center gap-2 text-[11px] font-extrabold text-primary uppercase tracking-[0.2em] mb-4">
                      <CheckCircle2 size={16} /> Final Review & Admission
                   </h4>
                   <p className="text-sm text-slate-600 mb-6 max-w-md">
                     Verify all documents below before admitting. You must specify the <strong>Monthly Payment Commitment</strong> for the financial agreement.
                   </p>
                   
                   <div className="max-w-sm">
                      <Input 
                        label="Monthly Payment Commitment" 
                        type="number" 
                        placeholder="e.g. 5000"
                        value={monthlyCommitment}
                        onChange={(e) => setMonthlyCommitment(e.target.value)}
                        icon={<span className="text-slate-400 font-bold">₱</span>}
                        className="bg-white border-2 border-primary/10 focus-within:border-primary transition-all rounded-xl"
                      />
                   </div>
                 </div>
              </section>
           </div>

           {/* Right Column: Interactive Checklist */}
           <div className="lg:col-span-1">
             <section className="bg-slate-50 p-6 rounded-3xl border border-slate-200 h-full shadow-inner shadow-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="flex items-center gap-2 text-[11px] font-extrabold text-slate-500 uppercase tracking-[0.1em]">
                     <FileText size={14} className="text-primary" /> Document Tracking
                  </h4>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => markAll(true)}
                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tight"
                    >
                      All
                    </button>
                    <button 
                      type="button"
                      onClick={() => markAll(false)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-tight"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                   {Object.keys(checklist).map(key => (
                      <label 
                        key={key} 
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${
                          checklist[key].submitted 
                          ? 'bg-primary text-white border-primary shadow-md transform scale-[1.02]' 
                          : 'bg-white border-slate-100 hover:border-primary/30 text-slate-600 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                         <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                           checklist[key].submitted 
                           ? 'bg-white/20 border-white/20 text-white' 
                           : 'bg-slate-100 border-slate-200 group-hover:border-primary/20'
                         }`}>
                            {checklist[key].submitted && <Check size={14} strokeWidth={4} />}
                         </div>

                         <span className={`text-[11px] font-bold uppercase tracking-wide flex-1 ${
                           checklist[key].submitted ? 'text-white' : 'text-slate-700'
                         }`}>
                            {key.replace(/_/g, ' ')}
                         </span>

                         {checklist[key].submitted && (
                            <div className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-widest text-white/90">
                              Verified
                            </div>
                         )}

                         <input 
                           type="checkbox" 
                           checked={checklist[key].submitted} 
                           onChange={() => toggleDocument(key)}
                           className="hidden"
                         />
                      </label>
                   ))}
                </div>
                
                <div className="mt-8">
                  <Button 
                    variant="ghost" 
                    fullWidth 
                    className="text-primary font-bold border-2 border-primary/20 hover:border-primary/40 bg-white" 
                    onClick={handleUpdateChecklist}
                  >
                    Save Progress Only
                  </Button>
                </div>
             </section>
           </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex justify-between items-center pt-8 border-t border-slate-200 mt-4 relative z-20">
          <Button 
            variant="ghost" 
            className="text-slate-400 hover:text-slate-600" 
            onClick={onClose}
          >
            Cancel Review
          </Button>
          
          <div className="flex gap-4">
            <Button 
              variant="primary" 
              size="lg"
              className="px-8 shadow-lg shadow-primary/20"
              onClick={handleAdmit} 
              loading={isAdmitting}
              icon={<ShieldCheck size={20} />}
              disabled={!monthlyCommitment}
            >
              Admit & Finalize Registration
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

/**
 * DataRow - Visual helper for labeled information
 */
const DataRow = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 last:pb-0">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
    <span className="text-sm font-bold text-slate-700">{value || 'N/A'}</span>
  </div>
);

export default ApplicantDetailsModal;
