import React from 'react';

/**
 * PageHeader Component
 * Standardized header for main pages with title, description, and optional action buttons
 * 
 * @param {string} title - Main page title
 * @param {string} description - Subtitle/description below the title
 * @param {ReactNode} actions - Optional right-aligned action buttons (usually children wrapped in a fragment or div)
 * @param {ReactNode} badge - Optional badge to display next to the title
 * @param {string} className - Optional extra CSS classes
 */
const PageHeader = ({ 
  title, 
  description, 
  actions, 
  badge,
  className = '' 
}) => {
  return (
    <div className={`page-header border-b border-slate-200 pb-6 mb-6 ${className}`}>
        <div className="header-title-section">
            <div className="flex items-center gap-3 mb-1">
                <h2>{title}</h2>
                {badge && <div>{badge}</div>}
            </div>
            {description && <p className="text-slate-500 text-sm">{description}</p>}
        </div>
        
        {actions && (
            <div className="flex items-center gap-3">
                {actions}
            </div>
        )}
    </div>
  );
};

export default PageHeader;
