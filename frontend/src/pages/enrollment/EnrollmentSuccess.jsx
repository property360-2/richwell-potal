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
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-[40px] p-12 max-w-2xl w-full shadow-2xl shadow-blue-100 border border-gray-100 text-center relative overflow-hidden"
            >
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full -ml-32 -mb-32 blur-3xl opacity-50"></div>

                <div className="relative z-10">
                    <div className="w-24 h-24 bg-green-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-100 animate-bounce">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </div>

                    <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Application Received!</h2>
                    <p className="text-gray-500 font-bold mb-12 leading-relaxed">
                        Thank you for choosing Richwell Colleges. Your enrollment application has been submitted successfully and is now being reviewed by our Admissions Office.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                        <div className="bg-gray-50 p-6 rounded-3xl text-left border border-gray-100 hover:border-blue-200 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm">Check Email</h4>
                            </div>
                            <p className="text-xs font-bold text-gray-500 leading-relaxed">
                                We've sent a confirmation email with your reference number and next steps.
                            </p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-3xl text-left border border-gray-100 hover:border-blue-200 transition-colors">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm">Review Timeline</h4>
                            </div>
                            <p className="text-xs font-bold text-gray-500 leading-relaxed">
                                Please allow 1-3 working days for our team to process your application.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Button 
                            onClick={() => navigate('/auth/login')}
                            className="w-full py-4 text-lg"
                            variant="primary"
                            icon={ArrowRight}
                        >
                            GO TO LOGIN
                        </Button>
                        <button 
                            onClick={() => navigate('/')}
                            className="w-full py-4 text-gray-400 font-black uppercase tracking-widest text-xs hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
                        >
                            <HelpCircle className="w-4 h-4" /> Need assistance?
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EnrollmentSuccess;
