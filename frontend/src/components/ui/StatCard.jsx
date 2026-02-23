 import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color = 'blue', className = '' }) => {
    const colors = {
        blue: 'text-blue-600 bg-blue-50/50 border-blue-100/50 shadow-blue-500/5',
        green: 'text-green-600 bg-green-50/50 border-green-100/50 shadow-green-500/5',
        amber: 'text-amber-600 bg-amber-50/50 border-amber-100/50 shadow-amber-500/5',
        indigo: 'text-indigo-600 bg-indigo-50/50 border-indigo-100/50 shadow-indigo-500/5',
        purple: 'text-purple-600 bg-purple-50/50 border-purple-100/50 shadow-purple-500/5',
        rose: 'text-rose-600 bg-rose-50/50 border-rose-100/50 shadow-rose-500/5'
    };

    const colorClasses = colors[color] || colors.blue;

    return (
        <div className={`bg-white p-6 rounded-[32px] border shadow-xl transition-all hover:shadow-2xl hover:scale-[1.02] group ${colorClasses} ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                </div>
                <ArrowRightLeft className="w-4 h-4 opacity-10 group-hover:opacity-20 transition-opacity" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">{label}</p>
            <p className="text-xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>
        </div>
    );
};

export default StatCard;
