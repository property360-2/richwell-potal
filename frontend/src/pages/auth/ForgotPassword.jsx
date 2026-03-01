import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Loader2, Info, Clock } from 'lucide-react';
import SEO from '../../components/shared/SEO';
import { api, endpoints } from '../../api';

const ForgotPasswordPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Forgot Password" description="Reset your Richwell Portal password." />

            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-blue-100/50 border border-gray-100">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <Clock className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Work in Progress</h2>
                        <p className="text-gray-500 font-bold text-sm leading-relaxed mt-4">
                            The online password reset feature is currently under development.
                        </p>
                        
                        <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col items-center gap-3">
                            <h3 className="text-lg font-black text-blue-900 tracking-tight">Coming Soon</h3>
                            <p className="text-sm font-bold text-blue-700 leading-relaxed text-center">
                                This feature will be available in a future update. For now, please visit the <span className="text-blue-900 font-black">Registrar's Office</span> if you need immediate assistance with your password.
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-gray-100 text-center">
                        <Link
                            to="/auth/login"
                            className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
