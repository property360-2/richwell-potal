import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { setToastEmitter } from '../components/ui/Toast.jsx';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', action = null) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prevToasts) => [...prevToasts, { id, message, type, action }]);

        // Auto remove after 5 seconds (standardized)
        setTimeout(() => {
            setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
        }, 5000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const success = useCallback((message, action = null) => showToast(message, 'success', action), [showToast]);
    const error = useCallback((message, action = null) => showToast(message, 'error', action), [showToast]);
    const warning = useCallback((message, action = null) => showToast(message, 'warning', action), [showToast]);
    const info = useCallback((message, action = null) => showToast(message, 'info', action), [showToast]);

    useEffect(() => {
        setToastEmitter({ success, error, warning, info });
        return () => setToastEmitter(null);
    }, [success, error, warning, info]);

    return (
        <ToastContext.Provider value={{ success, error, warning, info, removeToast }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

const ToastItem = ({ toast, onRemove }) => {
    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-600" />,
        error: <AlertCircle className="w-5 h-5 text-red-600" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        info: <Info className="w-5 h-5 text-blue-600" />
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        warning: 'bg-amber-50 border-amber-200',
        info: 'bg-blue-50 border-blue-200'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border-2 backdrop-blur-sm ${bgColors[toast.type]}`}
            role="alert"
        >
            <div className="flex-shrink-0 mt-0.5">
                {icons[toast.type]}
            </div>
            <div className="flex-1 text-sm font-semibold text-gray-900 leading-relaxed">
                {toast.message}
            </div>
            <button
                onClick={onRemove}
                className="flex-shrink-0 ml-2 p-1 rounded-lg hover:bg-black/5 transition-colors"
                aria-label="Close"
            >
                <X className="w-4 h-4 text-gray-400" />
            </button>
        </motion.div>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
