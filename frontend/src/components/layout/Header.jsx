import React from 'react';
import { Bell, User, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

const Header = ({ title = 'Dashboard' }) => {
  const { user, role } = useAuth();
  
  return (
    <header className="header">
      <div className="header-left">
        <button className="mobile-menu-btn d-md-none" aria-label="Open Menu">
          <Menu size={20} />
        </button>
        <h1 className="header-title">{title}</h1>
      </div>
      
      <div className="header-actions">
        <button className="header-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="notification-badge"></span>
        </button>
        
        <div className="user-profile">
          <div className="user-avatar">
            <User size={18} />
          </div>
          <div className="user-info">
            <span className="user-name">{user?.username || 'Admin User'}</span>
            <span className="user-role">{role || 'Administrator'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
