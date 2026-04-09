import React, { useState, useEffect } from 'react';
import { FileCheck, ShieldAlert, CheckCircle2, AlertCircle, ShieldCheck, ShieldOff } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { studentsApi } from '../../../api/students';

const RegistrarVerificationModal = ({ isOpen, onClose, onSuccess, student }) => {
  const [checklist, setChecklist] = useState({});
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (student?.document_checklist) {
      // Deep copy to avoid mutating the prop directly
      setChecklist(JSON.parse(JSON.stringify(student.document_checklist)));
    } else {
      setChecklist({});
    }
  }, [student, isOpen]);

  const handleToggleVerified = (docName) => {
    setChecklist(prev => ({
      ...prev,
      [docName]: {
        ...prev[docName],
        verified: !prev[docName]?.verified
      }
    }));
  };

  const handleSave = async () => {
    if (!student) return;
    
    try {
      setLoading(true);
      await studentsApi.updateStudent(student.id, {
        document_checklist: checklist
      });
      showToast('success', 'Document verification saved successfully');
      onSuccess();
      onClose();
    } catch (err) {
      showToast('error', 'Failed to save document verification');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockAdvising = async () => {
    if (!student) return;
    
    try {
      setUnlocking(true);
      await studentsApi.unlockAdvising(student.id);
      showToast('success', 'Advising unlocked for student');
      onSuccess();
      onClose();
    } catch (err) {
      showToast('error', 'Failed to unlock advising');
    } finally {
      setUnlocking(false);
    }
  };

  if (!student) return null;

  const docs = Object.entries(checklist);
  const totalDocs = docs.length;
  const verifiedCount = docs.filter(([_, data]) => data.verified).length;
  const isAllVerified = totalDocs > 0 && verifiedCount === totalDocs;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify Student Documents"
      size="md"
    >
      <div className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-lg flex items-start gap-3 border border-slate-100">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-0.5">
            <FileCheck size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">
              {student.user.first_name} {student.user.last_name}
            </h3>
            <p className="text-sm text-slate-500 font-medium">IDN: {student.idn} • {student.program_details?.code || 'No Program'}</p>
            <p className="text-xs text-slate-400 mt-1">
              Second-level verification for official enrollment. Ensure physical documents match the Admission records.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-slate-700">Document Checklist</h4>
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={() => {
                  const allSubmittedVerified = Object.values(checklist)
                    .filter(d => d.submitted)
                    .every(d => d.verified);
                  
                  setChecklist(prev => {
                    const next = JSON.parse(JSON.stringify(prev));
                    Object.keys(next).forEach(key => {
                      if (next[key].submitted) {
                        next[key].verified = !allSubmittedVerified;
                      }
                    });
                    return next;
                  });
                }}
                className="text-xs font-bold text-primary hover:text-primary-dark transition-colors uppercase tracking-wider"
              >
                {Object.values(checklist).filter(d => d.submitted).every(d => d.verified) 
                  ? 'Deselect All' 
                  : 'Select All'}
              </button>
              <span className="text-sm text-slate-500 font-medium">
                Verified: {verifiedCount} / {totalDocs}
              </span>
            </div>
          </div>

          {docs.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded text-slate-400 text-sm">
              No documents in checklist.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              {docs.map(([docName, data]) => {
                const isSubmitted = data.submitted;
                const isVerified = data.verified;

                return (
                  <div key={docName} className={`p-3 flex items-center justify-between transition-colors ${isVerified ? 'bg-green-50/30' : 'bg-white'}`}>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 text-sm">{docName}</div>
                      <div className="flex items-center mt-1 gap-2">
                        {isSubmitted ? (
                          <Badge variant="success">Submitted to Admission</Badge>
                        ) : (
                          <Badge variant="neutral">Not Submitted</Badge>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 pl-4 border-l border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleToggleVerified(docName)}
                        className={`flex flex-col items-center justify-center w-24 h-12 rounded border transition-all ${
                          isVerified
                            ? 'bg-green-50 border-green-200 text-green-700 shadow-sm'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                        }`}
                      >
                        {isVerified ? (
                          <>
                            <CheckCircle2 size={16} className="mb-0.5 text-green-600" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={16} className="mb-0.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Verify</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isAllVerified && (
          <div className="flex gap-2 items-center text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
            <ShieldAlert size={16} />
            <span className="font-medium">All required documents have been verified. Excellent!</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button 
            variant="outline" 
            onClick={handleUnlockAdvising} 
            loading={unlocking}
            disabled={student.is_advising_unlocked || loading}
            className={student.is_advising_unlocked ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 hover:bg-amber-50'}
            icon={student.is_advising_unlocked ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
          >
            {student.is_advising_unlocked ? 'Advising Unlocked' : 'Force Unlock Advising'}
          </Button>
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose} disabled={loading || unlocking}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={loading} disabled={unlocking}>
            Save Verification
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RegistrarVerificationModal;
