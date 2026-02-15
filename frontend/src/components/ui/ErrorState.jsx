import React from 'react';
import { AlertCircle, WifiOff, ShieldAlert, RotateCcw, Loader2 } from 'lucide-react';
import Button from './Button';

/**
 * ErrorState Component
 * Displays error states with retry functionality and premium styling.
 */
const ErrorState = ({ 
    title = 'Something went wrong', 
    message = 'We encountered an error while loading this content. Please try again.', 
    onRetry, 
    retryText = 'Try Again', 
    showRetry = true,
    icon = 'error',
    isRetrying = false
}) => {
    const getIcon = () => {
        switch (icon) {
            case 'network': return WifiOff;
            case 'forbidden': return ShieldAlert;
            default: return AlertCircle;
        }
    };

    const Icon = getIcon();

    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500" role="alert" aria-live="polite">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl shadow-red-100 animate-pulse">
                <Icon className="w-12 h-12" />
            </div>
            
            <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tighter uppercase italic">
                {title}
            </h3>
            
            <p className="text-gray-500 font-bold max-w-md mb-10 leading-relaxed uppercase tracking-widest text-[10px]">
                {message}
            </p>
            
            {showRetry && onRetry && (
                <Button 
                    variant="danger" 
                    icon={isRetrying ? Loader2 : RotateCcw}
                    loading={isRetrying}
                    onClick={onRetry}
                    className="px-10 py-4 shadow-xl shadow-red-500/20"
                >
                    {isRetrying ? 'SYNCHRONIZING...' : retryText.toUpperCase()}
                </Button>
            )}
        </div>
    );
};

/**
 * Helper function to parse API error messages for the component
 */
export const parseApiError = (error) => {
    if (!navigator.onLine) {
        return {
            title: 'Communication Failure',
            message: 'Target server is unreachable. Please verify your uplink.',
            icon: 'network'
        };
    }

    if (error?.status === 403) {
        return {
            title: 'Security Violation',
            message: 'You do not have the clearance levels required for this node.',
            icon: 'forbidden',
            showRetry: false
        };
    }

    return {
        title: 'Transmission Error',
        message: error?.message || 'The data packet was corrupted or withheld by the host.',
        icon: 'error'
    };
};

export default ErrorState;
