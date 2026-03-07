import React from 'react';
import './Card.css';

const Card = ({ children, className = '', clickable = false, padding = true, onClick }) => {
  const baseClass = 'card';
  const clickableClass = clickable ? 'card-clickable' : '';
  const paddingClass = padding ? 'card-padding' : '';
  
  return (
    <div 
      className={`${baseClass} ${clickableClass} ${paddingClass} ${className}`}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export default Card;
