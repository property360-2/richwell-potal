import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Mail, Calendar, HelpCircle } from 'lucide-react';
import Button from '../../components/ui/Button';

const EnrollmentSuccess = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-[48px] p-12 md:p-16 max-w-3xl w-full shadow-[0_32px_128px_-16px_rgba(59,130,246,0.1)] border border-blue-50/50 text-center relative overflow-hidden"
            >
                {/* Modern Abstract Decoration */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-full blur-3xl opacity-60"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-tr from-green-50/50 to-blue-50/20 rounded-full blur-3xl opacity-60"></div>

                <div className="relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-blue-200 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>

                    <h2 className="text-5xl font-black text-gray-900 mb-6 tracking-tight leading-tight">
                        You're all set, <span className="text-blue-600">Future Student!</span>
                    </h2>
                    <p className="text-lg font-bold text-gray-500 max-w-xl mx-auto mb-16 leading-relaxed">
                        Your enrollment application has been submitted. We've created your portal profile and the Admissions Office is now verifying your documents.
                    </p>

                    <div className="text-left bg-gray-50/50 border border-gray-100 rounded-[32px] p-8 md:p-10 mb-12">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8 ml-1">What Happens Next?</h4>
                        <div className="space-y-8">
                            <StepItem 
                                icon={ShieldCheck} 
                                title="Registrar Verification" 
                                description="Our team will review your uploaded documents and personal details within 1-3 working days." 
                                color="blue"
                            />
                            <StepItem 
                                icon={Mail} 
                                title="Admission Approval" 
                                description="You will receive a notification once your student ID is officially activated." 
                                color="green"
                            />
                            <StepItem 
                                icon={ArrowRight} 
                                title="Portal Exploration" 
                                description="Once approved, you can log in with the credentials we provided to manage your subjects and grades." 
                                color="gray"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button 
                            onClick={() => navigate('/auth/login')}
                            className="flex-1 py-5 rounded-2xl text-lg shadow-xl shadow-blue-100"
                            variant="primary"
                        >
                            GO TO PORTAL
                        </Button>
                        <button 
                            onClick={() => navigate('/')}
                            className="flex-1 py-5 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 hover:text-gray-900 transition-all border border-transparent hover:border-gray-200"
                        >
                            RETURN HOME
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const StepItem = ({ icon: Icon, title, description, color }) => {
    const colors = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        gray: 'bg-gray-100 text-gray-600',
    };

    return (
        <div className="flex gap-6 group">
            <div className={`shrink-0 w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center shadow-lg shadow-black/5 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h5 className="font-black text-gray-900 text-base mb-1">{title}</h5>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">{description}</p>
            </div>
        </div>
    );
};

const ShieldCheck = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

export default EnrollmentSuccess;
