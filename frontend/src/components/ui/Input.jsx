import React, { forwardRef, useId } from 'react';
import './Input.css';

const Input = forwardRef((props, ref) => {
  const { 
    label, 
    error, 
    id, 
    className = '', 
    disabled = false, 
    type = 'text',
    icon: Icon,
    helperText,
    fullWidth = false,
    multiline = false,
    ...restProps 
  } = props;

  const defaultId = useId();
  const inputId = id || defaultId;
  const hasError = !!error;
  
  const InputElement = multiline ? 'textarea' : 'input';
  
  return (
    <div className={`input-container ${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      
      <div className="input-wrapper">
        {Icon && !multiline && (
          <span className="input-icon-left">
            {React.isValidElement(Icon) ? Icon : <Icon size={16} />}
          </span>
        )}
        
        <InputElement
          id={inputId}
          ref={ref}
          type={multiline ? undefined : type}
          disabled={disabled}
          className={`input-field ${hasError ? 'input-error' : ''} ${Icon && !multiline ? 'has-icon-left' : ''} ${multiline ? 'min-h-[120px] py-3' : ''}`}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          {...restProps}
        />
      </div>
      
      {helperText && !hasError && (
        <p className="input-helper-text">
          {helperText}
        </p>
      )}
      
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
