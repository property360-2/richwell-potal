import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './pages/errors/ErrorBoundary';
import './styles/index.css';

// Add the idle timer logic inside a wrapped component so it can use hooks
import { useIdleTimer } from './hooks/useIdleTimer';

const IdleTimerWrapper = () => {
  useIdleTimer(30, 25); // 30 min timeout, warn at 25 min
  return null;
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
