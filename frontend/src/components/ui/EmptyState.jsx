import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from './Button';

/**
 * EmptyState Component
 * Reusable empty state pattern for consistent UX across all pages.
 */
const EmptyState = ({ 
    icon: Icon, 
    title, 
    description, 
    action 
}) => {
    return (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-500/5 p-12 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 mx-auto bg-gray-50 rounded-3xl flex items-center justify-center text-gray-400 mb-6 shadow-inner">
                {Icon && <Icon className="w-10 h-10" />}
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">
                {title}
            </h3>
            
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] max-w-sm mx-auto mb-8 leading-relaxed">
                {description}
            </p>
            
            {action && (
                <Button 
                    variant="primary" 
                    icon={action.icon}
                    onClick={action.onClick}
                    className="px-8"
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
};

export default EmptyState;
