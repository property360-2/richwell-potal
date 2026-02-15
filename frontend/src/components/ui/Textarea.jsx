import React from 'react';

const Textarea = ({ 
    value,
    onChange,
    placeholder,
    rows = 4,
    maxLength,
    showCounter = false,
    variant = 'default',
    disabled = false,
    className = '',
    ...props 
}) => {
    const variants = {
        default: 'bg-gray-50 border-transparent focus:bg-white focus:border-blue-200',
        error: 'bg-red-50 border-red-200 focus:bg-white focus:border-red-400'
    };

    const baseClasses = 'w-full px-5 py-4 border rounded-2xl text-sm font-bold text-gray-900 outline-none transition-all placeholder:text-gray-300 resize-none disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = variants[variant] || variants.default;

    return (
        <div className="relative">
            <textarea
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                maxLength={maxLength}
                disabled={disabled}
                className={`${baseClasses} ${variantClasses} ${className}`}
                {...props}
            />
            {showCounter && maxLength && (
                <div className="absolute bottom-3 right-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {value?.length || 0} / {maxLength}
                </div>
            )}
        </div>
    );
};

export default Textarea;
