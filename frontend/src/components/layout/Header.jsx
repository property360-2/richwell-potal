import React from 'react';
import { User, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';
import NotificationBell from './NotificationBell';

const Header = ({ title = 'Dashboard', onMenuToggle }) => {
  const { user, role } = useAuth();
  
  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="mobile-menu-btn d-md-none" 
          aria-label="Open Menu"
          onClick={onMenuToggle}
        >
          <Menu size={20} />
        </button>
        <h1 className="header-title">{title}</h1>
      </div>
      
      <div className="header-actions">
        <NotificationBell />
        
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
