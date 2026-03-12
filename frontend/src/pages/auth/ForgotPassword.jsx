import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import Button from '../../components/ui/Button';
import './Login.css'; // Reusing the same beautiful styles

const ForgotPassword = () => {
  const navigate = useNavigate();

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
              <img src="/school-logo.png" alt="Richwell Logo" />
            </div>
            <h1 className="login-title">Forgot Password</h1>
            <p className="login-subtitle">Need to reset your access?</p>
          </div>

          <div style={{ padding: '0 8px 16px', textAlign: 'center', lineHeight: '1.6' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--color-warning)' }}>
              <ShieldAlert size={48} strokeWidth={1.5} />
            </div>
            <p style={{ color: 'var(--color-text)', marginBottom: '12px', fontWeight: '500' }}>
              For security reasons, self-service password rests are disabled.
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Please contact your <strong>School Administrator</strong> or IT Department to reset your password and restore access to your account.
            </p>
          </div>
          <Button 
            variant="secondary"
            className="w-full justify-center py-3"
            onClick={() => navigate('/login')}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Sign In
          </Button>

        </div>
        
        <div className="login-footer">
          © {new Date().getFullYear()} Richwell Colleges Inc.<br/>All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
