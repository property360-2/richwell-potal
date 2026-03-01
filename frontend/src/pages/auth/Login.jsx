import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SEO from '../../components/shared/SEO';
import { api, endpoints, TokenManager } from '../../api';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Clock, Info } from 'lucide-react';
import Button from '../../components/ui/Button';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loginError, setLoginError] = useState(null);
    const [isEnrollmentEnabled, setIsEnrollmentEnabled] = useState(true);

    const { login, user } = useAuth();
    const { success, error, warning } = useToast();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            handleRedirect(user.role);
        }
    }, [user, navigate]);

    // Load remembered email on mount
    useEffect(() => {
        const savedEmail = localStorage.getItem('portal_remembered_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    useEffect(() => {
        const checkEnrollmentStatus = async () => {
            try {
                const response = await api.get(endpoints.enrollmentStatus);
                // The API returns { enrollment_enabled: true/false, ... }
                setIsEnrollmentEnabled(response?.enrollment_enabled ?? true);
            } catch (err) {
                console.error('Failed to fetch enrollment status:', err);
                setIsEnrollmentEnabled(true); // Fallback to visible if API fails
            }
        };
        checkEnrollmentStatus();
    }, []);

    const handleRedirect = (role) => {
        const routes = {
            'STUDENT': '/dashboard',
            'ADMISSION_STAFF': '/admission/dashboard',
            'ADMIN': '/admin/dashboard',
            'REGISTRAR': '/registrar/dashboard',
            'HEAD_REGISTRAR': '/registrar/dashboard',
            'DEPARTMENT_HEAD': '/head/dashboard',
            'CASHIER': '/cashier/dashboard',
            'PROFESSOR': '/professor/dashboard'
        };
        navigate(routes[role] || '/dashboard');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email || !password) {
            error('Please enter both email and password');
            return;
        }

        setIsLoading(true);
        try {
            const userData = await login({ email, password });

            // Check if student account is pending approval
            if (userData.role === 'STUDENT' && userData.enrollment_status === 'PENDING') {
                warning('Your account is pending approval. Please wait for the Admissions Office to review your application.');
                setIsLoading(false);
                return;
            }

            // Check if student account was rejected
            if (userData.role === 'STUDENT' && userData.enrollment_status === 'REJECTED') {
                error('Your application has been rejected. Please contact the Admissions Office.');
                setIsLoading(false);
                return;
            }

            // Save or clear remember me email
            if (rememberMe) {
                localStorage.setItem('portal_remembered_email', email);
            } else {
                localStorage.removeItem('portal_remembered_email');
            }

            success('Login successful!');
            handleRedirect(userData.role);
        } catch (err) {
            console.error('Login error:', err);
            
            let message = 'Invalid email or password';
            if (err.status === 401 || err.message?.includes('401')) {
                message = 'Invalid email or password';
            } else if (err.message) {
                message = err.message;
            }
            
            setLoginError(message);
            error(message); // Show toast as well
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Portal Login" description="Access the Richwell Portal to manage your academic and financial records." />
            
            <div className="w-full max-w-md">
                {/* Login Form */}
                <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-blue-100/50 border border-gray-100">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Welcome Back</h2>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sign in to your account</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {loginError && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <Info className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-red-900">Login Failed</p>
                                    <p className="text-xs text-red-600 font-medium">{loginError}</p>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setLoginError(null);
                                    }}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all" 
                                    placeholder="you@email.com" 
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                <input 
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setLoginError(null);
                                    }}
                                    className="w-full pl-12 pr-14 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all" 
                                    placeholder="••••••••" 
                                    required
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-5 h-5 rounded-lg border-2 border-gray-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                    />
                                </div>
                                <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                            </label>
                            <Link to="/auth/forgot-password" className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline">
                                Forgot password?
                            </Link>
                        </div>
                        
                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full py-4 text-lg"
                            loading={isLoading}
                            icon={ArrowRight}
                        >
                            Sign In
                        </Button>
                    </form>
                    
                    {isEnrollmentEnabled && (
                        <div className="mt-8 text-center">
                            <p className="text-gray-500 font-bold text-sm uppercase tracking-tight">
                                Don't have an account? 
                                <Link to="/enrollment" className="text-blue-600 ml-2 hover:underline">Enroll Now</Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
