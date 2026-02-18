import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Loader2, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import SEO from '../../components/shared/SEO';
import { api, endpoints } from '../../api';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [tokenEmail, setTokenEmail] = useState('');
    const [tokenError, setTokenError] = useState('');
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    // Validate token on mount
    useEffect(() => {
        if (!token) {
            setTokenError('No reset token provided. Please request a new reset link.');
            setValidating(false);
            return;
        }
        validateToken();
    }, [token]);

    const validateToken = async () => {
        try {
            setValidating(true);
            const res = await api.post(endpoints.passwordValidateToken, { token });
            if (res.success && res.data?.valid) {
                setTokenValid(true);
                setTokenEmail(res.data.email || '');
            } else {
                setTokenError(res.message || 'Invalid or expired reset link.');
            }
        } catch (err) {
            setTokenError(err.message || 'Invalid or expired reset link.');
        } finally {
            setValidating(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!newPassword || !confirmPassword) {
            setError('Please fill in both password fields');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.post(endpoints.passwordReset, {
                token,
                new_password: newPassword
            });
            if (res.success) {
                setSuccess(true);
            } else {
                setError(res.message || 'Failed to reset password');
            }
        } catch (err) {
            setError(err.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state
    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Validating Reset Link...</p>
                </div>
            </div>
        );
    }

    // Invalid token state
    if (!tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 py-12 px-4">
                <SEO title="Invalid Reset Link" description="Password reset link is invalid or expired." />
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-blue-100/50 border border-gray-100 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Invalid Reset Link</h2>
                        <p className="text-gray-500 font-bold text-sm leading-relaxed mb-8">{tokenError}</p>
                        <Link
                            to="/auth/forgot-password"
                            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-lg shadow-blue-200"
                        >
                            Request New Link
                        </Link>
                        <div className="mt-6">
                            <Link to="/auth/login" className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline">
                                <ArrowLeft className="w-4 h-4" /> Back to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Reset Password" description="Set your new password for Richwell Portal." />

            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-blue-100/50 border border-gray-100">
                    {!success ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Reset Password</h2>
                                {tokenEmail && (
                                    <p className="text-gray-500 font-bold text-sm">
                                        For <span className="text-gray-900">{tokenEmail}</span>
                                    </p>
                                )}
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
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">New Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                                            className="w-full pl-12 pr-14 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all"
                                            placeholder="Minimum 8 characters"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Confirm Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all"
                                            placeholder="Re-enter your password"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password requirements hint */}
                                <div className="px-4 py-3 bg-gray-50 rounded-xl">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Requirements</p>
                                    <p className={`text-xs font-bold ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                                        • At least 8 characters {newPassword.length >= 8 && '✓'}
                                    </p>
                                    <p className={`text-xs font-bold ${newPassword && confirmPassword && newPassword === confirmPassword ? 'text-green-600' : 'text-gray-400'}`}>
                                        • Passwords match {newPassword && confirmPassword && newPassword === confirmPassword && '✓'}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                                >
                                    {isLoading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Resetting...</>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Password Reset!</h2>
                            <p className="text-gray-500 font-bold text-sm leading-relaxed mb-8">
                                Your password has been changed successfully. You can now log in with your new password.
                            </p>
                            <Link
                                to="/auth/login"
                                className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-colors shadow-lg shadow-blue-200"
                            >
                                Go to Login
                            </Link>
                        </div>
                    )}

                    {!success && (
                        <div className="mt-8 text-center">
                            <Link
                                to="/auth/login"
                                className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
