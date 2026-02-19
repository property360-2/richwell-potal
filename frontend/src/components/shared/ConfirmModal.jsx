import React from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';
import Button from '../ui/Button';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'Confirm Action', 
    message = 'Are you sure you want to proceed?', 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    isDestructive = false,
    isLoading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
                onClick={!isLoading ? onClose : undefined}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 uppercase">
                <div className="p-8 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {isDestructive ? <AlertTriangle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                    </div>
                    
                    <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tighter">
                        {title}
                    </h3>
                    
                    <p className="text-gray-500 font-bold text-sm leading-relaxed mb-8 normal-case">
                        {message}
                    </p>

                    <div className="flex gap-3 justify-center">
                        <Button 
                            variant="ghost" 
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1"
                        >
                            {cancelText}
                        </Button>
                        <Button 
                            variant={isDestructive ? 'danger' : 'primary'} 
                            onClick={onConfirm}
                            disabled={isLoading}
                            isLoading={isLoading}
                            icon={isDestructive ? AlertTriangle : Check}
                            className="flex-1"
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
