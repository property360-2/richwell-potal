import React from 'react';
import './Card.css';

const Card = ({ 
  children, 
  title,
  icon: Icon,
  className = '', 
  clickable = false, 
  padding = true, 
  onClick 
}) => {
  const baseClass = 'card';
  const clickableClass = clickable ? 'card-clickable' : '';
  const paddingClass = padding ? 'card-padding' : '';
  
  return (
    <div 
      className={`${baseClass} ${clickableClass} ${className}`}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {(title || Icon) && (
        <div className="card-header flex items-center gap-3">
          {Icon && (
            <span className="card-icon text-slate-400">
              {React.isValidElement(Icon) ? Icon : <Icon size={18} />}
            </span>
          )}
          {title && <h3 className="card-title font-bold text-slate-800">{title}</h3>}
        </div>
      )}
      <div className={paddingClass}>
        {children}
      </div>
    </div>
  );
};

export default Card;
