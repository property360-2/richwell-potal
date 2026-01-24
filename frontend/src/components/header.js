// Header component - main navigation header for all pages
// Combines logo, desktop nav, mobile menu, user info, and logout

import { createDesktopNavigation } from './navigation.js';
import { createHamburgerButton, createMobileDrawer, initMobileMenu } from './mobile-menu.js';

/**
 * Create complete header component
 * @param {Object} options
 * @param {string} options.role - User role (STUDENT, REGISTRAR, etc.)
 * @param {string} options.activePage - Current page identifier
 * @param {Object} options.user - User object { first_name, last_name, email }
 * @param {string} options.roleDisplay - Display name for role (optional, defaults to formatted role)
 * @returns {string} Complete header HTML
 */
export function createHeader({ role, activePage, user, roleDisplay = null }) {
  const displayRole = roleDisplay || formatRole(role);
  const userName = `${user?.first_name || 'User'} ${user?.last_name || ''}`.trim();

  // Initialize mobile menu handlers (only once)
  setTimeout(() => initMobileMenu(), 0);

  return `
    <header class="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <!-- Logo Section -->
        <div class="flex items-center gap-3">
          <img src="/logo.jpg" alt="Richwell Colleges" class="w-10 h-10 rounded-lg object-cover">
          <div>
            <span class="text-xl font-bold gradient-text">Richwell Colleges</span>
            <span class="text-sm text-gray-500 ml-2 hidden sm:inline">${displayRole}</span>
          </div>
        </div>

        <!-- Desktop Navigation (hidden on mobile) -->
        ${createDesktopNavigation({ role, activePage })}

        <!-- Right Section: Notifications + User Info + Logout + Mobile Menu -->
        <div class="flex items-center gap-4">
          <!-- User Info (hidden on small screens) -->
          <div class="text-right hidden sm:block">
            <p class="text-sm font-medium text-gray-800">${userName}</p>
            <p class="text-xs text-gray-500">${displayRole}</p>
          </div>
          
          <!-- Notification Bell (will be initialized after render) -->
          <div id="notification-bell-placeholder"></div>

          <!-- Logout Button (hidden on mobile, shown in drawer instead) -->
          <button onclick="logout()" class="hidden md:flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            <span class="hidden lg:inline">Logout</span>
          </button>

          <!-- Hamburger Menu Button (mobile only) -->
          ${createHamburgerButton()}
        </div>
      </div>
    </header>

    <!-- Mobile Menu Drawer -->
    ${createMobileDrawer({ role, activePage, user })}
  `;
}

/**
 * Format role for display
 * @param {string} role - Role key or value
 * @returns {string} Formatted role display name
 */
function formatRole(role) {
  const roleDisplayMap = {
    'STUDENT': 'Student Portal',
    'student': 'Student Portal',
    'REGISTRAR': 'Registrar Portal',
    'registrar': 'Registrar Portal',
    'HEAD_REGISTRAR': 'Registrar Portal',
    'PROFESSOR': 'Professor Portal',
    'professor': 'Professor Portal',
    'DEPARTMENT_HEAD': 'Department Head',
    'head': 'Department Head',
    'CASHIER': 'Cashier Portal',
    'cashier': 'Cashier Portal',
    'ADMISSION': 'Admission Office',
    'ADMISSION_STAFF': 'Admission Office',
    'admission': 'Admission Office',
    'ADMIN': 'Admin Portal',
    'admin': 'Admin Portal'
  };
  return roleDisplayMap[role] || 'Portal';
}
