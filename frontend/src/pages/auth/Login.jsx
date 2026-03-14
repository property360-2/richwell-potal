import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { User, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState('');
  const [throttleSeconds, setThrottleSeconds] = useState(0);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  // Handle countdown for throttling
  useEffect(() => {
    if (throttleSeconds <= 0) return;

    const timer = setInterval(() => {
      setThrottleSeconds(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [throttleSeconds]);

  const getDashboardPath = (role) => {
    switch (role) {
      case 'ADMIN': return '/admin';
      case 'REGISTRAR': return '/registrar';
      case 'HEAD_REGISTRAR': return '/head-registrar';
      case 'ADMISSION': return '/admission';
      case 'CASHIER': return '/cashier';
      case 'DEAN': return '/dean';
      case 'PROGRAM_HEAD': return '/program-head';
      case 'PROFESSOR': return '/professor';
      case 'STUDENT': return '/student';
      default: return '/';
    }
  };

  const onSubmit = async (data) => {
    setErrorMsg('');
    setThrottleSeconds(0);
    const result = await login(data);
    
    if (result.success) {
      const role = result.user?.role;
      const from = location.state?.from?.pathname;
      
      let targetPath = getDashboardPath(role);
      
      if (from && from !== '/' && from !== '/login') {
        const isAdminPath = from.startsWith('/admin') || from.startsWith('/registrar') || from.startsWith('/admission');
        const isStudentPath = from.startsWith('/student');
        
        if (role === 'STUDENT' && isStudentPath) {
          targetPath = from;
        } else if (role !== 'STUDENT' && isAdminPath) {
          targetPath = from;
        } else if (!isAdminPath && !isStudentPath) {
          targetPath = from;
        }
      }
      
      navigate(targetPath, { replace: true });
    } else {
      const msg = result.message || 'Invalid credentials';
      setErrorMsg(msg);
      
      // Parse throttle seconds if present (Django default format)
      const match = msg.match(/available in (\d+) seconds/i);
      if (match) {
        setThrottleSeconds(parseInt(match[1]));
      }
    }
  };

  return (
    <div className="login-page-container">
      {/* Abstract Background Orbs */}
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>
      <div className="bg-orb bg-orb-3"></div>

      <div className="login-content-wrapper">
        <div className="login-card">
          
          <div className="login-header">
            <div className="login-logo-container">
              <img src="/school-logo-v2.png" alt="Richwell Logo" />
            </div>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Sign in to your Richwell Portal</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="login-form">
            {errorMsg && (
              <div className="error-banner">
                <AlertCircle size={20} />
                <span>
                  {throttleSeconds > 0 
                    ? `Too many attempts. Available in ${throttleSeconds} seconds.` 
                    : errorMsg}
                </span>
              </div>
            )}
            
            <div className="form-group pb-1">
              <Input
                label="Username or Email"
                placeholder="Enter your ID or email"
                icon={User}
                error={errors.username?.message}
                {...register('username', { required: 'Username is required' })}
              />
            </div>
            
            <div className="form-group">
              <Input
                type="password"
                label="Password"
                placeholder="••••••••"
                icon={Lock}
                error={errors.password?.message}
                {...register('password', { required: 'Password is required' })}
              />
              <div className="flex justify-end mt-1">
                <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:text-primary-hover">Forgot password?</Link>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full justify-center mt-2 py-3" 
              loading={isSubmitting}
            >
              Sign In {!isSubmitting && <ArrowRight size={16} className="ml-2" />}
            </Button>
          </form>

        </div>
        
        <div className="login-footer">
          © {new Date().getFullYear()} Richwell Colleges Inc.<br/>All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Login;
