import React from 'react';
import { AlertCircle } from 'lucide-react';

const FormField = ({ 
    label,
    children,
    error,
    required = false,
    hint,
    className = '' 
}) => {
    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            {children}
            {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-bold ml-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{error}</span>
                </div>
            )}
            {hint && !error && (
                <p className="text-[10px] font-bold text-gray-400 ml-1">{hint}</p>
            )}
        </div>
    );
};

export default FormField;
