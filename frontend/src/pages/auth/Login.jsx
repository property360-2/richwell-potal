import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    setErrorMsg('');
    const result = await login(data);
    
    if (result.success) {
      // The ProtectedRoute will handle redirecting to the change password page
      // if mustChangePassword is true, otherwise it drops them at their dashboard
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } else {
      setErrorMsg(result.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Richwell Portal</h1>
          <p className="text-slate-500 mt-2">Sign in to your account</p>
        </div>
        
        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium">
                {errorMsg}
              </div>
            )}
            
            <Input
              label="Username or Email"
              type="text"
              placeholder="Enter your ID or email"
              error={errors.username?.message}
              {...register('username', { required: 'Username is required' })}
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              loading={isSubmitting}
            >
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
