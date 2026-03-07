import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, BookOpen, Calendar, 
  GraduationCap, ClipboardList, Clock, CreditCard, 
  Building, Bell, Settings, LogOut, Menu, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './Sidebar.css';

// Map specific roles to their color theme according to DESIGN_SYSTEM
const roleColors = {
  ADMIN: 'var(--color-role-admin)',
  REGISTRAR: 'var(--color-role-registrar)',
  HEAD_REGISTRAR: 'var(--color-role-head-registrar)',
  ADMISSION: 'var(--color-role-admission)',
  CASHIER: 'var(--color-role-cashier)',
  DEAN: 'var(--color-role-dean)',
  PROGRAM_HEAD: 'var(--color-role-programhead)',
  PROFESSOR: 'var(--color-role-professor)',
  STUDENT: 'var(--color-role-student)',
};

const getNavItems = (role) => {
  // Common items for everyone (placeholder logic)
  const items = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  ];

  if (['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR'].includes(role)) {
    items.push({ path: '/admin/staff', label: 'User Management', icon: Users });
    items.push({ path: '/admin/academics', label: 'Academics', icon: BookOpen });
    items.push({ path: '/terms', label: 'Terms', icon: Calendar });
    items.push({ path: '/students', label: 'Students', icon: GraduationCap });
    items.push({ path: '/sections', label: 'Sections', icon: Users });
    items.push({ path: '/scheduling', label: 'Scheduling', icon: Clock });
    items.push({ path: '/grades', label: 'Grades', icon: ClipboardList });
  }

  if (['CASHIER', 'ADMIN'].includes(role)) {
    items.push({ path: '/finance', label: 'Finance', icon: CreditCard });
  }

  if (['ADMIN'].includes(role)) {
    items.push({ path: '/facilities', label: 'Facilities', icon: Building });
    items.push({ path: '/auditing', label: 'Audit Logs', icon: Settings });
  }

  return items;
};

const Sidebar = () => {
  const { role, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  
  const navItems = getNavItems(role || 'ADMIN'); // fallback for demo
  const themeColor = roleColors[role] || 'var(--color-primary)';

  return (
    <>
      <div className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="sidebar-header">
          {!collapsed && (
            <div className="sidebar-logo">
              <span className="logo-text" style={{ color: themeColor }}>Richwell</span>
              <span className="logo-sub">Portal</span>
            </div>
          )}
          <button 
            className="sidebar-toggle" 
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  style={({ isActive }) => isActive && !collapsed ? { borderLeftColor: themeColor, backgroundColor: 'var(--color-primary-light)', color: themeColor } : {}}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={20} className="nav-icon" />
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link logout-btn" onClick={logout} title={collapsed ? 'Logout' : undefined}>
            <LogOut size={20} className="nav-icon" />
            {!collapsed && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
