import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    CalendarDays, 
    BookOpen, 
    Award, 
    FileCheck2,
    LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
    { label: 'Dashboard', path: '/professor/dashboard', icon: LayoutDashboard },
    { label: 'Schedule', path: '/professor/schedule', icon: CalendarDays },
    { label: 'Sections', path: '/professor/sections', icon: BookOpen },
    { label: 'Grade Submission', path: '/professor/grades', icon: Award },
    { label: 'Grade Resolution', path: '/professor/resolutions', icon: FileCheck2 },
];

const ProfessorLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50/30">
            {/* Top Navigation */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between py-3">
                        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path || 
                                    (item.path === '/professor/dashboard' && location.pathname === '/professor');
                                const Icon = item.icon;

                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        className={`
                                            flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300
                                            ${isActive 
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                                                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}
                                        `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>
                        
                        {/* Logout Button */}
                        <button
                            onClick={logout}
                            className="flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-white hover:bg-red-500 transition-all duration-300 ml-4 border border-red-100 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/25"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Page Content */}
            <div>{children}</div>
        </div>
    );
};

export default ProfessorLayout;
