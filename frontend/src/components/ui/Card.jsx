import React from 'react';

const Card = ({ 
    children,
    variant = 'default',
    header,
    footer,
    className = '',
    onClick,
    ...props 
}) => {
    const variants = {
        default: 'bg-white border-gray-100 shadow-xl shadow-gray-500/5',
        highlighted: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-xl shadow-blue-500/10',
        bordered: 'bg-white border-gray-200 shadow-sm',
        dark: 'bg-gray-900 border-gray-800 shadow-2xl shadow-gray-900/20 text-white'
    };

    const baseClasses = 'rounded-[40px] border transition-all';
    const variantClasses = variants[variant] || variants.default;
    const interactiveClasses = onClick ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.01]' : '';

    return (
        <div 
            className={`${baseClasses} ${variantClasses} ${interactiveClasses} ${className}`}
            onClick={onClick}
            {...props}
        >
            {header && (
                <div className="px-8 py-6 border-b border-gray-100">
                    {header}
                </div>
            )}
            <div className="p-8">
                {children}
            </div>
            {footer && (
                <div className="px-8 py-6 border-t border-gray-100">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default Card;
