import React from 'react';

const Spinner = ({ size = 'md', color = 'text-blue-600', className = '' }) => {
    const sizes = {
        xs: 'w-4 h-4',
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24'
    };

    const sizeClass = sizes[size] || sizes.md;

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <svg
                className={`${sizeClass} ${color} animate-spin`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-label="Loading"
                role="status"
            >
                <circle
                    className="opacity-20"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                ></circle>
                <path
                    className="opacity-100"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
            </svg>
        </div>
    );
};

export const LoadingOverlay = ({ message = 'Synchronizing...' }) => (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in duration-500">
        <div className="text-center">
            <Spinner size="lg" className="mb-6" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                {message}
            </p>
        </div>
    </div>
);

export default Spinner;
