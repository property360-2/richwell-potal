import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './PageWrapper.css';

const PageWrapper = ({ children, title }) => {
  return (
    <div className="page-wrapper">
      <Sidebar />
      <div className="main-content">
        <Header title={title} />
        <main className="content-area">
          <div className="content-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PageWrapper;
