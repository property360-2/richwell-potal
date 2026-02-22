import React from 'react';
import { Clock, CheckCircle2, User, Shield, AlertCircle } from 'lucide-react';

const ResolutionStatus = ({ status, resolution = {} }) => {
    const steps = [
        { id: 'PENDING_HEAD', label: 'Dept. Head', icon: User, signature: resolution?.reviewed_by_head_name, date: resolution?.head_action_at },
        { id: 'PENDING_REGISTRAR', label: 'Registrar', icon: Shield, signature: resolution?.reviewed_by_registrar_name, date: resolution?.registrar_action_at },
        { id: 'APPROVED', label: 'Finalized', icon: CheckCircle2, signature: resolution?.reviewed_by_registrar_name, date: resolution?.registrar_action_at }
    ];

    const getStatusIndex = (s) => {
        if (s === 'REJECTED') return -1;
        if (s === 'APPROVED') return 2;
        return steps.findIndex(step => step.id === s);
    };

    const currentIndex = getStatusIndex(status);

    if (status === 'REJECTED') {
        return (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 group relative cursor-help">
                <AlertCircle className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">Declined</span>
            </div>
        );
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="flex items-center gap-1">
            {steps.map((step, index) => {
                const isPast = index < currentIndex;
                const isCurrent = index === currentIndex;
                const Icon = step.icon;
                const showDetails = step.signature && (isPast || (status === 'APPROVED' && index === 2));

                return (
                    <React.Fragment key={step.id}>
                        <div className="relative group">
                            <div 
                                className={`p-1.5 rounded-lg transition-all ${
                                    isCurrent ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 
                                    isPast || (status === 'APPROVED' && index === 2) ? 'bg-green-100 text-green-600' : 
                                    'bg-gray-50 text-gray-300'
                                }`}
                            >
                                <Icon className="w-3 h-3" />
                            </div>
                            
                            {/* Detailed Tooltip */}
                            {showDetails && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-gray-900 text-white rounded-xl text-[9px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                                    <p className="text-gray-400 uppercase tracking-widest mb-1">{step.label} Approved</p>
                                    <p className="font-black text-[10px]">{step.signature}</p>
                                    <p className="text-blue-400 mt-0.5">{formatDate(step.date)}</p>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
                                </div>
                            )}
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`h-0.5 w-2 rounded-full ${isPast || (status === 'APPROVED' && index <= currentIndex - 1) ? 'bg-green-500' : 'bg-gray-100'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default ResolutionStatus;
