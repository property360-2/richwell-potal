import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './PageWrapper.css';

const PageWrapper = ({ title }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className={`page-wrapper ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        mobileOpen={isMenuOpen} 
        onClose={closeMenu} 
      />
      
      {isMenuOpen && (
        <div className="mobile-overlay" onClick={closeMenu} />
      )}

      <div className="main-content">
        <Header title={title} onMenuToggle={toggleMenu} />
        <main className="content-area">
          <div className="content-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PageWrapper;
