import React from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import AppRoutes from './routes';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './pages/errors/ErrorBoundary';
import './styles/index.css';

// Add the idle timer logic inside a wrapped component so it can use hooks
import { useIdleTimer } from './hooks/useIdleTimer';

import SessionWarning from './components/ui/SessionWarning';

const IdleTimerWrapper = () => {
  const { showWarning, extendSession, timeLeft } = useIdleTimer(30, 25);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <SessionWarning 
      isOpen={showWarning}
      onExtend={extendSession}
      onLogout={handleLogout}
      timeLeft={timeLeft}
    />
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <IdleTimerWrapper />
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
