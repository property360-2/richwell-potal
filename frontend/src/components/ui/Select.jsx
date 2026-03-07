import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';

const Select = forwardRef(({ 
  label, 
  options = [], 
  error, 
  id, 
  className = '', 
  disabled = false, 
  placeholder,
  ...props 
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substring(2, 9)}`;
  const hasError = !!error;
  
  return (
    <div className={`select-container ${className}`}>
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label}
        </label>
      )}
      
      <div className="select-wrapper">
        <select
          id={selectId}
          ref={ref}
          disabled={disabled}
          className={`select-field ${hasError ? 'select-error' : ''} ${(placeholder && !props.value) ? 'select-unselected' : ''}`}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${selectId}-error` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        
        <div className="select-icon-right">
          <ChevronDown size={16} />
        </div>
      </div>
      
      {hasError && (
        <span id={`${selectId}-error`} className="select-error-text" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
