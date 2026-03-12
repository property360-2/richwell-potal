/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';
import './Toast.css';

// eslint-disable-next-line react-refresh/only-export-components
const ToastContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);

const Toast = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle className="toast-icon success" size={20} />,
    error: <XCircle className="toast-icon error" size={20} />,
    warning: <AlertCircle className="toast-icon warning" size={20} />,
    info: <Info className="toast-icon info" size={20} />
  };

  return (
    <div className={`toast toast-${type}`}>
      {icons[type]}
      <p className="toast-message">{message}</p>
      <button className="toast-close" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((msgOrType, typeOrMsg = 'info', duration = 5000) => {
    // Detect parameter order: if first arg is one of the types, it's (type, message)
    const types = ['success', 'error', 'warning', 'info', 'neutral', 'primary'];
    let message = msgOrType;
    let type = typeOrMsg;
    
    // Check if parameters are swapped: addToast('error', 'My message') instead of addToast('My message', 'error')
    if (types.includes(msgOrType) && !types.includes(typeOrMsg)) {
        message = typeOrMsg;
        type = msgOrType;
    }

    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    
    if (duration) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  useEffect(() => {
    const handleApiError = (event) => {
      const message = event.detail?.message || 'An unexpected error occurred. Please try again.';
      addToast(message, 'error', 7000);
    };
    
    window.addEventListener('api-error', handleApiError);
    return () => window.removeEventListener('api-error', handleApiError);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ showToast: addToast, addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast 
            key={toast.id} 
            message={toast.message} 
            type={toast.type} 
            onClose={() => removeToast(toast.id)} 
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
