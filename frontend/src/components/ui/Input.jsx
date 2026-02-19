import React from 'react';

const Input = ({ 
    type = 'text',
    value,
    onChange,
    placeholder,
    icon: Icon,
    iconPosition = 'left',
    variant = 'default',
    disabled = false,
    className = '',
    ...props 
}) => {
    const variants = {
        default: 'bg-gray-50 border-transparent focus:bg-white focus:border-blue-200',
        error: 'bg-red-50 border-red-200 focus:bg-white focus:border-red-400',
        success: 'bg-green-50 border-green-200 focus:bg-white focus:border-green-400'
    };

    const baseClasses = 'w-full px-5 py-4 border rounded-2xl text-sm font-black text-gray-900 outline-none transition-all placeholder:text-gray-300 placeholder:font-bold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
    
    const variantClasses = variants[variant] || variants.default;

    if (Icon) {
        return (
            <div className="relative">
                {iconPosition === 'left' && (
                    <Icon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`${baseClasses} ${variantClasses} ${iconPosition === 'left' ? 'pl-14' : 'pr-14'} ${className}`}
                    {...props}
                />
                {iconPosition === 'right' && (
                    <Icon className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                )}
            </div>
        );
    }

    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`${baseClasses} ${variantClasses} ${className}`}
            {...props}
        />
    );
};

export default Input;
