import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './PageWrapper.css';

const PageWrapper = ({ title }) => {
  return (
    <div className="page-wrapper">
      <Sidebar />
      <div className="main-content">
        <Header title={title} />
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
