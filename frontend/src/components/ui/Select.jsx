import React, { forwardRef, useId } from 'react';
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
  icon: Icon,
  fullWidth = false,
  ...props 
}, ref) => {
  const defaultId = useId();
  const selectId = id || defaultId;
  const hasError = !!error;
  
  return (
    <div className={`select-container ${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label htmlFor={selectId} className="select-label">
          {label}
        </label>
      )}
      
      <div className="select-wrapper">
        {Icon && (
          <span className="select-icon-left">
            {React.isValidElement(Icon) ? Icon : <Icon size={16} />}
          </span>
        )}
        <select
          id={selectId}
          ref={ref}
          disabled={disabled}
          className={`select-field ${hasError ? 'select-error' : ''} ${(placeholder && !props.value) ? 'select-unselected' : ''} ${Icon ? 'has-icon-left' : ''}`}
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
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
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
