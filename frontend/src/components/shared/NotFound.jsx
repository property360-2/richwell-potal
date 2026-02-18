import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertCircle, ArrowLeft } from 'lucide-react';
import SEO from './SEO';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <SEO title="Page Not Found" description="The page you are looking for does not exist." />
            
            <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-blue-900/5 p-12 text-center border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-red-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner shadow-red-100">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                
                <h1 className="text-8xl font-black text-gray-900 mb-2 tracking-tighter">404</h1>
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-4">Page Not Found</h2>
                
                <p className="text-gray-500 font-medium mb-10 leading-relaxed text-sm">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>
                
                <div className="space-y-3">
                    <Link 
                        to="/" 
                        className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 transform active:scale-95"
                    >
                        <Home className="w-4 h-4" /> Go to Dashboard
                    </Link>
                    
                    <button 
                        onClick={() => window.history.back()}
                        className="flex items-center justify-center gap-2 w-full py-4 bg-white text-gray-600 border-2 border-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-gray-200 hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" /> Go Back
                    </button>
                </div>
            </div>
            
            <p className="mt-8 text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                Richwell Colleges Portal
            </p>
        </div>
    );
};

export default NotFound;
