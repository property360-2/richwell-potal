import React from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'md', className = '', ...props }) => {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 48,
  };
  
  return (
    <div className={`spinner-container ${className}`} {...props}>
      <Loader2 
        className="spinner-icon" 
        size={sizeMap[size] || sizeMap.md} 
      />
    </div>
  );
};

export default LoadingSpinner;
