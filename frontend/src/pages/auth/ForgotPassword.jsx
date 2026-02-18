import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Loader2, Info } from 'lucide-react';
import SEO from '../../components/shared/SEO';
import { api, endpoints } from '../../api';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await api.post(endpoints.passwordRequestReset, { email });
            setSent(true);
        } catch (err) {
            // Backend always returns success for security, but handle network errors
            if (err.message?.includes('fetch') || err.message?.includes('network')) {
                setError('Unable to connect to server. Please try again.');
            } else {
                setSent(true); // Show success regardless (don't leak user existence)
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Forgot Password" description="Reset your Richwell Portal password." />

            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-blue-100/50 border border-gray-100">
                    {!sent ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                    <Mail className="w-8 h-8 text-blue-600" />
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Forgot Password</h2>
                                <p className="text-gray-500 font-bold text-sm leading-relaxed">
                                    Enter your email and we'll send you a link to reset your password.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="p-2 bg-red-100 rounded-lg">
                                            <Info className="w-5 h-5 text-red-600" />
                                        </div>
                                        <p className="text-sm font-bold text-red-700">{error}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all"
                                            placeholder="you@email.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                                >
                                    {isLoading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Check Your Email</h2>
                            <p className="text-gray-500 font-bold text-sm leading-relaxed mb-2">
                                If an account exists for <span className="text-gray-900">{email}</span>, we've sent a password reset link.
                            </p>
                            <p className="text-gray-400 text-xs font-bold mb-8">
                                The link will expire in 1 hour.
                            </p>
                            <button
                                onClick={() => { setSent(false); setEmail(''); }}
                                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase tracking-widest transition-colors"
                            >
                                Try Another Email
                            </button>
                        </div>
                    )}

                    <div className="mt-8 text-center">
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
