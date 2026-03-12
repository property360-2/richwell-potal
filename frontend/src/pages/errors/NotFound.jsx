import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import Button from '../../components/ui/Button';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <div className="not-found-watermark">404</div>
      
      <div className="not-found-content">
        <div className="not-found-icon-wrapper">
          <FileQuestion size={48} strokeWidth={2.5} />
        </div>
        
        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-message">
          Oops! The page you're looking for seems to have vanished into thin air. 
          Let's get you back on track.
        </p>

        <div className="not-found-actions">
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
            className="flex-1 shadow-lg shadow-primary/20"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
