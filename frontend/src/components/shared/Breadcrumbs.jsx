import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = ({ items }) => {
    const location = useLocation();
    
    // If no items provided, try to auto-generate (simple version)
    // Or just render nothing if items are missing for now to keep it safe
    const breadcrumbs = items || [];

    if (breadcrumbs.length === 0) return null;

    return (
        <nav className="flex items-center text-sm font-bold text-gray-500 mb-4 animate-in fade-in slide-in-from-left-2">
            <Link 
                to="/dashboard" 
                className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
                <Home className="w-4 h-4" />
            </Link>
            
            {breadcrumbs.map((item, index) => (
                <div key={index} className="flex items-center">
                    <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
                    {item.path ? (
                        <Link 
                            to={item.path} 
                            className="hover:text-blue-600 transition-colors uppercase tracking-wider text-[10px]"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 uppercase tracking-wider text-[10px]">
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    );
};

export default Breadcrumbs;
