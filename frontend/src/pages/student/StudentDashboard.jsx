import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

import { useToast } from '../../components/ui/Toast';
import { studentsApi } from '../../api/students';
import { termsApi } from '../../api/terms';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';

const StudentDashboard = () => {
  const [student, setStudent] = useState(null);
  const [activeTerm, setActiveTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [monthlyCommitment, setMonthlyCommitment] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [studentRes, termsRes] = await Promise.all([
        studentsApi.getStudents(),
        termsApi.getTerms({ is_active: 'true' })
      ]);

      const studentData = studentRes.data?.results ? studentRes.data.results[0] : studentRes.data[0];
      const activeTermData = termsRes.data?.results ? termsRes.data.results[0] : termsRes.data[0];

      setStudent(studentData);
      setActiveTerm(activeTermData);
    } catch (err) {
      showToast('error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!monthlyCommitment || isNaN(monthlyCommitment) || Number(monthlyCommitment) <= 0) {
      showToast('error', 'Please enter a valid monthly commitment amount');
      return;
    }

    try {
      setEnrollLoading(true);
      await studentsApi.returningStudent(student.id, {
        monthly_commitment: monthlyCommitment
      });
      showToast('success', 'Successfully enrolled for the term! Proceed to Advising.');
      setEnrollModalOpen(false);
      fetchData(); // Refresh data to hide the banner
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Enrollment failed';
      showToast('error', msg);
    } finally {
      setEnrollLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <h3 className="text-lg font-medium text-slate-800">Student Profile Not Found</h3>
            <p className="text-slate-500 mt-2">Could not locate your student record. Please contact the Registrar.</p>
          </div>
        </Card>
      </div>
    );
  }

  // Check if student needs to enroll
  // They need to enroll if there is an active term AND they don't have an enrollment record for it
  const isEnrolledInActiveTerm = activeTerm && student.latest_enrollment?.term === activeTerm.id;
  const needsToEnroll = activeTerm && !isEnrolledInActiveTerm;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome, {student.user.first_name}!</h1>
          <p className="text-slate-500">
            {student.program_details?.name || 'Program Not Set'} • {student.student_type}
          </p>
        </div>
        <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center gap-3">
          <div className="p-2 border border-slate-100 rounded bg-slate-50">
            <GraduationCap size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Student ID</div>
            <div className="font-bold text-slate-800">{student.idn}</div>
          </div>
        </div>
      </div>

      {/* Enrollment Banner */}
      {needsToEnroll && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-5 rounded-bl-[100px] pointer-events-none"></div>
          <div className="flex gap-4">
            <div className="shrink-0 p-3 bg-blue-100 text-blue-600 rounded-full mt-1 md:mt-0">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900">New Term Available: {activeTerm.name}</h3>
              <p className="text-blue-700/80 mt-1 max-w-xl">
                The enrollment period for this term is now open. You need to officially enroll to proceed with your subject advising and sectioning.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setEnrollModalOpen(true)}
            size="lg"
            className="shrink-0 w-full md:w-auto shadow-sm"
            icon={<ArrowRight size={18} />}
          >
            Enroll for This Term
          </Button>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Status Card */}
        <Card title="Current Status" className="md:col-span-2">
          {isEnrolledInActiveTerm ? (
            <div className="flex flex-col h-full justify-center space-y-4">
              <div className="flex items-center gap-3 bg-green-50 border border-green-100 p-4 rounded-lg">
                <CheckCircle2 className="text-green-600 shrink-0" size={24} />
                <div>
                  <h4 className="font-semibold text-green-800">Enrolled in {activeTerm?.name}</h4>
                  <p className="text-green-700 text-sm">Your enrollment for this term is active.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="p-4 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Year Level</div>
                  <div className="text-lg font-semibold text-slate-800">
                    {student.latest_enrollment?.year_level ? `Year ${student.latest_enrollment.year_level}` : 'Pending Advisory'}
                  </div>
                </div>
                <div className="p-4 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Advising Status</div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-slate-800">
                      {student.latest_enrollment?.advising_status || 'PENDING'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full justify-center items-center py-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                <AlertCircle size={24} />
              </div>
              <h4 className="font-medium text-slate-700">Not Currently Enrolled</h4>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                You are not enrolled in the active term. Please enroll using the banner above to unlock your dashboard features.
              </p>
            </div>
          )}
        </Card>

        {/* Quick Links Card */}
        <Card title="Quick Actions">
          <div className="flex flex-col gap-3">
            <Button 
              variant="secondary" 
              className="w-full justify-start text-left bg-slate-50 hover:bg-slate-100 border-transparent shadow-none"
              icon={<TrendingUp size={16} className="text-slate-400" />}
              disabled={!isEnrolledInActiveTerm}
            >
              <span className="flex-1">Subject Advising</span>
              <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">Step 1</span>
            </Button>
            
            <Button 
              variant="secondary" 
              className="w-full justify-start text-left bg-slate-50 hover:bg-slate-100 border-transparent shadow-none"
              icon={<Calendar size={16} className="text-slate-400" />}
              disabled={!isEnrolledInActiveTerm}
            >
              <span className="flex-1">Schedule Picking</span>
              <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">Step 2</span>
            </Button>

            <div className="h-px bg-slate-100 my-1"></div>

            <Button 
              variant="secondary" 
              className="w-full justify-start text-left bg-slate-50 hover:bg-slate-100 border-transparent shadow-none"
              icon={<CreditCard size={16} className="text-slate-400" />}
            >
              Payment History
            </Button>
          </div>
        </Card>

      </div>

      {/* Enrollment Modal */}
      <Modal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        title="Confirm Enrollment"
        size="sm"
      >
        <form onSubmit={handleEnroll} className="space-y-6">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-4 border border-blue-100">
            By proceeding, you are officially enrolling for <strong>{activeTerm?.name}</strong>. Please confirm your monthly payment commitment for this term below.
          </div>

          <Input
            label="Monthly Payment Commitment (₱)"
            type="number"
            placeholder="e.g. 2500"
            value={monthlyCommitment}
            onChange={(e) => setMonthlyCommitment(e.target.value)}
            required
            min="100"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setEnrollModalOpen(false)} 
              disabled={enrollLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={enrollLoading}>
              Confirm Enrollment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentDashboard;
