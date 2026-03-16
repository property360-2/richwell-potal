import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, BookOpen, Calendar, 
  GraduationCap, ClipboardList, Clock, CreditCard, 
  Building, Bell, Settings, LogOut, Menu, ChevronLeft,
  Briefcase, CheckCircle
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

const getNavItems = (role, isSuperUser = false) => {
  // No role? No items.
  if (!role && !isSuperUser) return [];

  const items = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const normalizedRole = role?.toUpperCase() || (isSuperUser ? 'ADMIN' : '');

  if (normalizedRole === 'ADMIN') {
    items.push({ path: '/admin/staff', label: 'User Management', icon: Users });
    items.push({ path: '/admin/academics', label: 'Academics', icon: BookOpen });
    items.push({ path: '/admin/terms', label: 'Terms', icon: Calendar });
    items.push({ path: '/admin/faculty', label: 'Faculty', icon: Briefcase });
  }

  if (['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR'].includes(normalizedRole)) {
    items.push({ path: '/registrar/grades', label: 'Grades', icon: ClipboardList });
  }

  if (['ADMISSION', 'ADMIN'].includes(normalizedRole)) {
    items.push({ path: '/admission/applicants', label: 'Applicants', icon: Users });
  }

  if (['ADMISSION', 'ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR'].includes(normalizedRole)) {
    items.push({ path: '/students', label: 'Students', icon: GraduationCap });
  }

  // Registrar Specifics
  if (['REGISTRAR', 'HEAD_REGISTRAR', 'ADMIN'].includes(normalizedRole)) {
    items.push({ path: '/registrar/verification', label: 'Verify Docs', icon: ClipboardList });
    items.push({ path: '/registrar/crediting', label: 'Subject Crediting', icon: BookOpen });
  }

  // Dean Logic
  if (normalizedRole === 'DEAN') {
    items.push({ type: 'label', label: 'Quick Actions' });
    items.push({ path: '/dean/scheduling', label: 'Manage Schedules', icon: Clock });
    items.push({ path: '/admin/faculty', label: 'Faculty Assignment', icon: Briefcase });
    items.push({ path: '/admin/rooms', label: 'Room Management', icon: Building });
    items.push({ path: '/admin/academics', label: 'Academic Programs', icon: BookOpen });
    items.push({ path: '/admin/sectioning', label: 'Sectioning Hub', icon: Users });
  }

  // Admin & Registrar shared logic for Sectioning
  if (normalizedRole === 'ADMIN') {
    items.push({ path: '/admin/sectioning', label: 'Sectioning', icon: Users });
    items.push({ path: '/dean/scheduling', label: 'Scheduling', icon: Clock });
  }

  if (normalizedRole === 'PROGRAM_HEAD') {
    items.push({ path: '/program-head/advising', label: 'Advising Approval', icon: CheckCircle });
  }

  if (['CASHIER', 'ADMIN'].includes(normalizedRole)) {
    items.push({ path: '/cashier', label: 'Finance', icon: CreditCard });
  }

  if (['ADMIN'].includes(normalizedRole)) {
    items.push({ path: '/admin/rooms', label: 'Rooms', icon: Building });
    items.push({ path: '/admin/audit', label: 'Audit Logs', icon: Settings });
  }

  if (normalizedRole === 'PROFESSOR') {
    items[0].path = '/professor'; // Point Dashboard directly to professor page
    items.push({ path: '/professor/grading', label: 'My Classes', icon: BookOpen });
    items.push({ path: '/professor/schedule', label: 'My Schedule', icon: Clock });
    items.push({ path: '/professor/resolutions', label: 'INC Resolutions', icon: CheckCircle });
  }

  if (normalizedRole === 'STUDENT') {
    items[0].path = '/student'; // Point Dashboard directly to student page
    items.push({ path: '/student/advising', label: 'Subject Advising', icon: ClipboardList });
    items.push({ path: '/student/grades', label: 'My Grades', icon: ClipboardList });
    items.push({ path: '/student/picking', label: 'Schedule Picking', icon: Clock });
    items.push({ path: '/student/schedule', label: 'My Schedule', icon: Clock });
    items.push({ path: '/student/finance', label: 'Payments', icon: CreditCard });
  }

  return items;
};

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { role, isSuperUser, logout } = useAuth();
  
  const navItems = getNavItems(role, isSuperUser); 
  const themeColor = roleColors[role?.toUpperCase()] || 'var(--color-primary)';

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
            {navItems.map((item, idx) => {
              if (item.type === 'label') {
                return !collapsed ? (
                  <li key={`label-${idx}`} className="nav-group-label">
                    {item.label}
                  </li>
                ) : <li key={`label-${idx}`} className="nav-group-divider" />;
              }
              return (
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
              );
            })}
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
