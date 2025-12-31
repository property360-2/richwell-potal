// Mobile menu component - hamburger button and slide-out drawer
// Provides mobile navigation functionality

import { createMobileNavigation } from './navigation.js';

/**
 * Create hamburger button for mobile menu
 * @returns {string} HTML for hamburger button
 */
export function createHamburgerButton() {
  return `
    <button
      id="mobile-menu-button"
      onclick="toggleMobileMenu()"
      class="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      aria-label="Toggle menu">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
      </svg>
    </button>
  `;
}

/**
 * Create mobile menu drawer
 * @param {Object} options
 * @param {string} options.role - User role
 * @param {string} options.activePage - Current page
 * @param {Object} options.user - User object with name/email
 * @returns {string} HTML for mobile drawer
 */
export function createMobileDrawer({ role, activePage, user }) {
  const userInitials = `${(user?.first_name || 'U')[0]}${(user?.last_name || '')[0] || ''}`;
  const userName = `${user?.first_name || 'User'} ${user?.last_name || ''}`.trim();
  const userEmail = user?.email || '';

  return `
    <div
      id="mobile-menu-overlay"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden transition-opacity duration-300"
      onclick="closeMobileMenu()">

      <div
        id="mobile-menu-drawer"
        class="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transform translate-x-full transition-transform duration-300"
        onclick="event.stopPropagation()">

        <!-- Drawer Header -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold">Menu</h2>
            <button
              onclick="closeMobileMenu()"
              class="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close menu">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- User Info -->
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
              ${userInitials}
            </div>
            <div>
              <p class="font-semibold">${userName}</p>
              <p class="text-sm text-blue-100">${userEmail}</p>
            </div>
          </div>
        </div>

        <!-- Navigation Links -->
        ${createMobileNavigation({ role, activePage })}

        <!-- Drawer Footer -->
        <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onclick="logout()"
            class="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize mobile menu functionality
 * Should be called once when component is rendered
 */
export function initMobileMenu() {
  // Add to window for onclick handlers
  window.toggleMobileMenu = function() {
    const overlay = document.getElementById('mobile-menu-overlay');
    const drawer = document.getElementById('mobile-menu-drawer');

    if (overlay && drawer) {
      overlay.classList.remove('hidden');
      // Trigger reflow for animation
      setTimeout(() => {
        overlay.classList.add('opacity-100');
        drawer.classList.remove('translate-x-full');
      }, 10);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeMobileMenu = function() {
    const overlay = document.getElementById('mobile-menu-overlay');
    const drawer = document.getElementById('mobile-menu-drawer');

    if (overlay && drawer) {
      overlay.classList.remove('opacity-100');
      drawer.classList.add('translate-x-full');

      setTimeout(() => {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
      }, 300);
    }
  };
}
