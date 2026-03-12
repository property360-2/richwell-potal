import React from 'react';
import { Inbox } from 'lucide-react';
import './EmptyState.css';

const EmptyState = ({ 
  icon: Icon = Inbox, 
  title = 'No Data Available', 
  message = 'There is nothing to show here at the moment.',
  action,
  className = ''
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon-wrapper">
        {React.isValidElement(Icon) ? Icon : <Icon size={32} className="empty-state-icon" />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};


// Quick inline styles for EmptyState since it's simple enough to use standard classes in the CSS later
// Actually, let's just make a small CSS file for it to be clean and match others.

export default EmptyState;
