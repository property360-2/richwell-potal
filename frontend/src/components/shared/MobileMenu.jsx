import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, LogOut, ChevronRight } from 'lucide-react';

const MobileMenu = ({ isOpen, onClose, user, navigation, onLogout }) => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    if (!isOpen) return null;

    const initials = `${user?.first_name?.[0] || 'U'}${user?.last_name?.[0] || ''}`;

    return (
        <div className="fixed inset-0 z-[6000] sm:hidden">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 rounded-l-[40px] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black tracking-tighter italic">MENU</h2>
                            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mt-1">Institutional Access</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
                            aria-label="Close menu"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center font-black text-2xl border border-white/10 backdrop-blur-md">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="font-black text-lg truncate leading-none mb-1 uppercase tracking-tight">{user?.first_name} {user?.last_name}</p>
                            <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest bg-white/10 px-2 py-1 rounded-lg inline-block border border-white/5">{user?.role}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-4 px-6 py-4 rounded-[20px] transition-all group ${
                                isActive(item.href)
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <item.icon size={22} className={isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'} />
                            <span className="flex-1 font-black text-sm uppercase tracking-tight">{item.name}</span>
                            <ChevronRight size={16} className={isActive(item.href) ? 'text-blue-300' : 'text-gray-200'} />
                        </Link>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-8 border-t border-gray-50 bg-gray-50/50">
                    <button
                        onClick={() => { onLogout(); onClose(); }}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-rose-600 border border-rose-100 rounded-[20px] font-black text-sm uppercase tracking-widest shadow-sm hover:bg-rose-50 transition-all"
                        aria-label="Logout"
                    >
                        <LogOut size={20} />
                        LOGOUT SYSTEM
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobileMenu;
