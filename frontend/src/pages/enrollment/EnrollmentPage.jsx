import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import { api, endpoints } from '../../api';
import { User, BookOpen, FileText, CreditCard, CheckCircle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

// Steps
import PersonalInfoStep from './steps/PersonalInfoStep';
import ProgramStep from './steps/ProgramStep';
import DocumentStep from './steps/DocumentStep';
import PaymentStep from './steps/PaymentStep';
import ReviewStep from './steps/ReviewStep';

const EnrollmentPage = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [enrollmentEnabled, setEnrollmentEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [programs, setPrograms] = useState([]);
    const [semesterInfo, setSemesterInfo] = useState({});
    
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        birthdate: '',
        address: '',
        contact_number: '',
        program_id: '',
        monthly_commitment: 5000,
        is_transferee: false,
        previous_school: '',
        previous_course: ''
    });

    const [documents, setDocuments] = useState([]);
    const { success, error, warning } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [statusRes, programsRes] = await Promise.all([
                fetch('/api/v1/admissions/system/enrollment-status/'),
                fetch('/api/v1/admissions/programs/')
            ]);

            if (statusRes.ok) {
                const data = await statusRes.json();
                setEnrollmentEnabled(data.enrollment_enabled !== false);
                setSemesterInfo({
                    name: data.semester_name || 'Current Semester',
                    academicYear: data.academic_year || '',
                    startDate: data.enrollment_start_date,
                    endDate: data.enrollment_end_date
                });
            }

            if (programsRes.ok) {
                const data = await programsRes.json();
                setPrograms(data.results || data || []);
            }
        } catch (err) {
            console.error('Error fetching enrollment data:', err);
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const finalData = new FormData();
            
            // Append basic info
            Object.keys(formData).forEach(key => {
                finalData.append(key, formData[key]);
            });

            // Append documents
            documents.forEach((file, index) => {
                finalData.append(`document_${index}`, file);
            });

            const response = await fetch('/api/v1/admissions/enrollment/apply/', {
                method: 'POST',
                body: finalData
            });

            if (response.ok) {
                success('Application submitted successfully!');
                navigate('/enrollment/success');
            } else {
                const errData = await response.json();
                error(errData.detail || 'Failed to submit application');
            }
        } catch (err) {
            error('An error occurred during submission');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Preparing Enrollment Portal...</p>
            </div>
        );
    }

    if (!enrollmentEnabled) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-12 max-w-md w-full shadow-2xl border border-gray-100 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-4">Enrollment Closed</h2>
                    <p className="text-gray-500 font-medium mb-8 leading-relaxed">Online enrollment is currently not available. Please check back later or contact the registrar's office.</p>
                    <button onClick={() => navigate('/auth/login')} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-gray-800 transition-all">
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    const steps = [
        { id: 1, name: 'Personal', icon: User },
        { id: 2, name: 'Program', icon: BookOpen },
        { id: 3, name: 'Documents', icon: FileText },
        { id: 4, name: 'Payment', icon: CreditCard },
        { id: 5, name: 'Review', icon: CheckCircle },
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <span className="text-xl font-black">R</span>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Richwell Colleges</h1>
                </div>
                <h2 className="text-4xl font-black text-gray-900 mb-2">Student Enrollment</h2>
                {semesterInfo.name && (
                    <p className="text-blue-600 font-black uppercase tracking-widest text-xs">
                        {semesterInfo.academicYear} {semesterInfo.name}
                    </p>
                )}
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-12 relative overflow-hidden px-2">
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 -z-10 mx-10"></div>
                {steps.map((step) => (
                    <div key={step.id} className="flex flex-col items-center group">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border-4 z-10 
                            ${currentStep >= step.id 
                                ? 'bg-blue-600 border-blue-100 text-white shadow-lg shadow-blue-200' 
                                : 'bg-white border-gray-100 text-gray-400'
                            }`}>
                            <step.icon className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest mt-3 transition-colors
                            ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'}`}>
                            {step.name}
                        </span>
                    </div>
                ))}
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl shadow-blue-100/50 border border-gray-100">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {currentStep === 1 && <PersonalInfoStep data={formData} onChange={handleFormChange} />}
                        {currentStep === 2 && <ProgramStep data={formData} programs={programs} onChange={handleFormChange} />}
                        {currentStep === 3 && <DocumentStep documents={documents} setDocuments={setDocuments} />}
                        {currentStep === 4 && <PaymentStep data={formData} onChange={handleFormChange} />}
                        {currentStep === 5 && <ReviewStep data={formData} documents={documents} programs={programs} />}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="mt-12 flex justify-between gap-4">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1 || submitting}
                        className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all
                            ${currentStep === 1 
                                ? 'opacity-0 pointer-events-none' 
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                        PREVIOUS
                    </button>

                    {currentStep < 5 ? (
                        <button
                            onClick={nextStep}
                            className="flex items-center gap-2 px-10 py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
                        >
                            NEXT STEP
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-2 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50"
                        >
                            {submitting ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    SUBMIT APPLICATION
                                    <CheckCircle className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div className="text-center mt-12">
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">
                    Already have an account? 
                    <button onClick={() => navigate('/auth/login')} className="text-blue-600 ml-2 hover:underline">
                        Log in here
                    </button>
                </p>
            </div>
        </div>
    );
};

export default EnrollmentPage;
