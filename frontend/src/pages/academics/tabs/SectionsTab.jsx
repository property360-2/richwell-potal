import React from 'react';
import { Layers, AlertCircle } from 'lucide-react';

const SectionsTab = () => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
            <div className="p-4 bg-green-100 text-green-600 rounded-full mb-4">
                <Layers size={48} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Section Management</h2>
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-100 mb-4">
                <AlertCircle size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Work in Progress</span>
            </div>
            <p className="text-gray-500 max-w-md">
                This module will handle section creation, student assignments, and capacity planning.
            </p>
        </div>
    );
};

export default SectionsTab;
