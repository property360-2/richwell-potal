import React from 'react';
import { X, Construction, Loader2 } from 'lucide-react';
import Button from '../../../components/ui/Button';

const WorkInProgressModal = ({ isOpen, onClose, title = "Feature Coming Soon" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 border border-amber-100">
                {/* Header */}
                <div className="bg-amber-500 p-10 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full -mr-12 -mt-12 blur-3xl"></div>
                    <div className="absolute left-0 bottom-0 w-24 h-24 bg-amber-400/20 rounded-full -ml-8 -mb-8 blur-2xl"></div>
                    
                    <div className="relative flex justify-between items-center text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center ring-1 ring-white/30">
                                <Construction size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">{title}</h2>
                                <p className="text-amber-50 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5 whitespace-nowrap">Development in Progress</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-12 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-amber-50 rounded-[32px] flex items-center justify-center mb-8 border border-amber-100/50 relative group">
                        <Construction className="text-amber-600 group-hover:rotate-12 transition-transform" size={40} />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md animate-bounce">
                            <span className="text-xs">🏗️</span>
                        </div>
                    </div>
                    
                    <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight uppercase italic tracking-tighter">Under Construction</h3>
                    <p className="text-gray-500 text-sm font-bold leading-relaxed max-w-[280px] uppercase tracking-wide">
                        Sinasabotahe pa namin 'yung code para sa feature na 'to. Balik ka na lang mamaya!
                    </p>
                    <div className="mt-8 flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
                        <Loader2 className="animate-spin" size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Status: In Development</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-10 pb-10">
                    <Button 
                        variant="primary" 
                        onClick={onClose}
                        className="w-full rounded-[22px] py-4 h-auto font-black uppercase tracking-widest text-[11px] bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-xl shadow-amber-100 border-none group"
                    >
                        Naintindihan Ko
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default WorkInProgressModal;
