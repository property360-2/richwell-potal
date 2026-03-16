import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '../../components/ui/Button';
import './Forbidden.css';

const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <div className="forbidden-container">
      <div className="forbidden-watermark">403</div>
      
      <div className="forbidden-content">
        <div className="forbidden-icon-wrapper">
          <ShieldAlert size={48} strokeWidth={2.5} />
        </div>
        
        <h1 className="forbidden-title">Access Denied</h1>
        <p className="forbidden-message">
          You don't have permission to access this page. If you believe this is a mistake, please contact the system administrator.
        </p>

        <div className="forbidden-actions">
          <Button 
            variant="secondary" 
            size="lg" 
            onClick={() => navigate(-1)}
            className="flex-1"
          >
            Go Back
          </Button>
          <Button 
            variant="primary" 
            size="lg" 
            onClick={() => navigate('/')}
            className="flex-1 shadow-lg shadow-red-500/20 bg-red-600 hover:bg-red-700 border-red-600"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
