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

    const { login, user } = useAuth();
    const { success, error, warning } = useToast();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            handleRedirect(user.role);
        }
    }, [user, navigate]);

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

            success('Login successful!');
            handleRedirect(userData.role);
        } catch (err) {
            console.error('Login error:', err);
            error(err.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <SEO title="Portal Login" description="Access the Richwell Portal to manage your academic and financial records." />
            {/* Background elements */}
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-white p-16 flex-col justify-between border-r border-gray-100">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <span className="text-2xl font-black">R</span>
                        </div>
                        <span className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Richwell Colleges</span>
                    </div>
                </div>
                
                <div className="max-w-md">
                    <h1 className="text-6xl font-black text-gray-900 leading-none mb-8">
                        Your pathway to<br />
                        <span className="text-blue-600">excellence.</span>
                    </h1>
                    <p className="text-gray-500 text-xl font-medium leading-relaxed">
                        Access your secure portal to manage your academic profile, view grades, and stay updated with campus life.
                    </p>
                    
                    <div className="mt-12 space-y-6">
                        <div className="flex items-center gap-4 text-gray-600 group">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <span className="font-bold">Secure & Encrypted Portal</span>
                        </div>
                        <div className="flex items-center gap-4 text-gray-600 group">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <Clock className="w-6 h-6" />
                            </div>
                            <span className="font-bold">Real-time Academic Updates</span>
                        </div>
                    </div>
                </div>
                
                <div className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                    © 2026 Richwell Colleges.
                </div>
            </div>
            
            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50/50">
                <div className="w-full max-w-md">
                    {/* Mobile Branding */}
                    <div className="lg:hidden text-center mb-12">
                         <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-blue-200">
                            <span className="text-3xl font-black">R</span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Richwell Colleges</h1>
                    </div>
                    
                    <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-blue-100/50 border border-gray-100">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Welcome Back</h2>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sign in to your account</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
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
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-14 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 transition-all" 
                                        placeholder="••••••••" 
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
                                <Link to="/auth/forgot-password" size="sm" className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline">
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
                        
                        <div className="mt-8 text-center">
                            <p className="text-gray-500 font-bold text-sm uppercase tracking-tight">
                                Don't have an account? 
                                <Link to="/" className="text-blue-600 ml-2 hover:underline">Enroll Now</Link>
                            </p>
                        </div>
                    </div>
                    
                    <div className="mt-8 p-6 bg-white/50 rounded-2xl border border-gray-100 flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
                            <Info className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Support</p>
                            <p className="text-xs font-bold text-gray-500 leading-relaxed">
                                Contact IT Support if you encountered issues while accessing your account.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
