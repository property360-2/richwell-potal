import React from 'react';
import './Tabs.css';

/**
 * TabButton Component
 * Consistent tab styling across the application
 * @param {Array} tabs - Array of { id, label, icon: Icon }
 * @param {string} activeTab - The currently active tab ID
 * @param {function} onTabChange - Function to call when a tab is clicked
 * @param {string} className - Optional additional classes for the container
 */
const Tabs = ({ 
  tabs = [], 
  activeTab, 
  onTabChange, 
  className = '' 
}) => {
  if (!tabs || tabs.length === 0) return null;

  return (
    <div className={`tabs-wrapper ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            type="button"
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {Icon && <Icon size={16} className="tab-icon" />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
