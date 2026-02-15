import React from 'react';
import { Building2, AlertCircle } from 'lucide-react';

const FacilitiesTab = () => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
            <div className="p-4 bg-orange-100 text-orange-600 rounded-full mb-4">
                <Building2 size={48} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Facilities Management</h2>
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-100 mb-4">
                <AlertCircle size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Work in Progress</span>
            </div>
            <p className="text-gray-500 max-w-md">
                This module will manage campus rooms, laboratories, and physical assets for scheduling.
            </p>
        </div>
    );
};

export default FacilitiesTab;
