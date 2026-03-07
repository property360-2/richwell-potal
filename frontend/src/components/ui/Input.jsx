import React, { forwardRef } from 'react';
import './Input.css';

const Input = forwardRef(({ 
  label, 
  error, 
  id, 
  className = '', 
  disabled = false, 
  type = 'text',
  icon: Icon,
  ...props 
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  const hasError = !!error;
  
  return (
    <div className={`input-container ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      
      <div className="input-wrapper">
        {Icon && (
          <span className="input-icon-left">
            {React.isValidElement(Icon) ? Icon : <Icon size={16} />}
          </span>
        )}
        
        <input
          id={inputId}
          ref={ref}
          type={type}
          disabled={disabled}
          className={`input-field ${hasError ? 'input-error' : ''} ${Icon ? 'has-icon-left' : ''}`}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          {...props}
        />
      </div>
      
      {hasError && (
        <span id={`${inputId}-error`} className="input-error-text" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
