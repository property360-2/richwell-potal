import React from 'react';
import { ChevronDown } from 'lucide-react';

const Select = ({ 
    value,
    onChange,
    options = [],
    placeholder = 'Select an option',
    disabled = false,
    variant = 'default',
    className = '',
    ...props 
}) => {
    const variants = {
        default: 'bg-gray-50 border-transparent focus:bg-white focus:border-blue-200',
        error: 'bg-red-50 border-red-200 focus:bg-white focus:border-red-400'
    };

    const baseClasses = 'w-full px-5 py-4 pr-12 border rounded-2xl text-sm font-black text-gray-900 outline-none transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = variants[variant] || variants.default;

    return (
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`${baseClasses} ${variantClasses} ${className}`}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((option, index) => (
                    <option key={index} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
    );
};

export default Select;
