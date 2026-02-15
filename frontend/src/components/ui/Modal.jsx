import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    actions, 
    size = 'md',
    closeOnBackdrop = true,
    showCloseButton = true 
}) => {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[95vw]'
    };

    const modalContent = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeOnBackdrop ? onClose : undefined}
                            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />

                        {/* Dialog */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`}
                        >
                            {/* Header */}
                            {(title || showCloseButton) && (
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {title}
                                    </h3>
                                    {showCloseButton && (
                                        <button
                                            onClick={onClose}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                            aria-label="Close modal"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Body */}
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
                                {children}
                            </div>

                            {/* Footer / Actions */}
                            {actions && actions.length > 0 && (
                                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                                    {actions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => action.onClick()}
                                            disabled={action.disabled}
                                            className={`px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50
                                                ${action.variant === 'primary' 
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200' 
                                                    : action.variant === 'danger'
                                                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200'
                                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default Modal;
