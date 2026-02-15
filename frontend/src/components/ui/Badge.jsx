import React from 'react';

const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: 'bg-gray-50 text-gray-500 border-gray-100',
        success: 'bg-green-50 text-green-600 border-green-100',
        warning: 'bg-amber-50 text-amber-600 border-amber-100',
        info: 'bg-blue-50 text-blue-600 border-blue-100',
        danger: 'bg-rose-50 text-rose-600 border-rose-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100'
    };

    return (
        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${variants[variant] || variants.default} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
