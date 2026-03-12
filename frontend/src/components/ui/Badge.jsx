import React from 'react';
import './Badge.css';

const Badge = ({ 
  children, 
  variant = 'neutral', 
  size = 'md',
  icon: Icon,
  className = '' 
}) => {
  return (
    <span className={`badge badge-${variant} badge-${size} ${className}`}>
      {Icon && (
        <span className="badge-icon" aria-hidden="true">
          {React.isValidElement(Icon) ? Icon : <Icon size={size === 'sm' ? 10 : 12} />}
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
