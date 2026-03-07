import React from 'react';
import { Loader2 } from 'lucide-react';
import './Button.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  loading = false, 
  disabled = false, 
  className = '', 
  type = 'button',
  ...props 
}) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  
  return (
    <button 
      type={type}
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="btn-icon animate-spin" size={size === 'sm' ? 14 : 16} />
      ) : Icon ? (
        <span className="btn-icon">
          {React.isValidElement(Icon) ? Icon : <Icon size={size === 'sm' ? 14 : 16} />}
        </span>
      ) : null}
      
      {children}
    </button>
  );
};

export default Button;
