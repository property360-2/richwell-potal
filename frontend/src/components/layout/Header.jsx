import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    LogOut, 
    BookOpen, 
    Users, 
    LayoutDashboard, 
    CheckCircle, 
    Calendar, 
    CreditCard, 
    Settings, 
    Activity, 
    FileText,
    Menu,
    X,
    Bell,
    GraduationCap
} from 'lucide-react';
import NotificationBell from '../shared/NotificationBell';
import MobileMenu from '../shared/MobileMenu';

const Header = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const getDashboardUrl = () => {
        if (!user) return '/';
        const routes = {
            'REGISTRAR': '/registrar/dashboard',
            'HEAD_REGISTRAR': '/registrar/dashboard',
            'ADMISSION_STAFF': '/admission/dashboard',
            'ADMIN': '/registrar/dashboard',
            'CASHIER': '/cashier/dashboard',
            'PROFESSOR': '/professor/dashboard',
            'DEPARTMENT_HEAD': '/head/dashboard'
        };
        return routes[user.role] || '/dashboard';
    };

    const navigation = [
        { name: 'Dashboard', href: getDashboardUrl(), icon: LayoutDashboard, roles: ['STUDENT', 'REGISTRAR', 'ADMIN', 'ADMISSION_STAFF', 'CASHIER', 'PROFESSOR', 'DEPARTMENT_HEAD'] },
        { name: 'Enrollment', href: '/enrollment', icon: BookOpen, roles: ['STUDENT', 'ADMISSION_STAFF'] },
        { name: 'Grades', href: '/student/grades', icon: CheckCircle, roles: ['STUDENT'] },
        { name: 'SOA', href: '/student/soa', icon: CreditCard, roles: ['STUDENT'] },
        { name: 'Schedule', href: '/student/schedule', icon: Calendar, roles: ['STUDENT'] },
        { name: 'Students', href: '/registrar/students', icon: Users, roles: ['REGISTRAR', 'ADMIN', 'CASHIER'] },
        { name: 'Resolutions', href: '/head/resolutions', icon: CheckCircle, roles: ['DEPARTMENT_HEAD', 'ADMIN'] },
        { name: 'Reports', href: '/head/reports', icon: FileText, roles: ['DEPARTMENT_HEAD', 'ADMIN', 'REGISTRAR'] },
        { name: 'Academics', href: '/academics', icon: GraduationCap, roles: ['ADMIN', 'HEAD_REGISTRAR'] },
        { name: 'Terms', href: '/admin/terms', icon: Calendar, roles: ['ADMIN'] },
        { name: 'Users', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
        { name: 'System', href: '/admin/config', icon: Settings, roles: ['ADMIN'] },
        { name: 'Audit', href: '/admin/audit-logs', icon: Activity, roles: ['ADMIN'] },
    ];

    const filteredNav = navigation.filter(item => 
        !item.roles || (user && item.roles.includes(user.role))
    );

    const isActive = (path) => location.pathname === path;

    return (
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-[5000] shadow-sm shadow-gray-200/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20">
                    <div className="flex items-center">
                        <nav className="hidden lg:flex items-center space-x-1">
                            {filteredNav.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                        isActive(item.href)
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                            : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="hidden sm:ml-6 sm:flex sm:items-center gap-6">
                        {user ? (
                            <>
                                <NotificationBell />
                                
                                <div className="flex items-center gap-4 pl-6 border-l border-gray-100">
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm font-black text-gray-900 leading-none uppercase tracking-tight">{user.first_name} {user.last_name}</p>
                                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1 bg-blue-50 px-2 py-0.5 rounded-lg inline-block border border-blue-100">{user.role}</p>
                                    </div>
                                    <button 
                                        onClick={logout}
                                        className="p-3 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-inner"
                                        title="Logout"
                                    >
                                        <LogOut size={20} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <Link to="/auth/login" className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95">
                                LOGIN SYSTEM
                            </Link>
                        )}
                    </div>

                    {/* Mobile toggle */}
                    <div className="flex items-center lg:hidden">
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="p-3 rounded-2xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-inner"
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu drawer */}
            <MobileMenu 
                isOpen={isMenuOpen} 
                onClose={() => setIsMenuOpen(false)} 
                user={user} 
                navigation={filteredNav} 
                onLogout={logout} 
            />
        </header>
    );
};

export default Header;
