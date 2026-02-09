/**
 * ChangePasswordModal Component
 * 
 * Reusable modal for changing user password.
 * Features:
 * - Current, New, Confirm password fields
 * - Visibility toggle
 * - Validation handling (min length, match)
 */

import { Icon } from '../../atoms/icons/Icon.js';

export const renderChangePasswordModal = ({
    isOpen = false,
    onClose = 'closeChangePasswordModal',
    onSubmit = 'submitPasswordChange',
    onToggleVisibility = 'togglePasswordVisibility'
}) => {
    if (!isOpen) return '';

    return `
    <div id="changePasswordModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="(e) => { if (e.target === this) ${onClose}(); }">
      <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onclick="event.stopPropagation()">
        <h3 class="text-xl font-bold text-gray-800 mb-2">Change Password</h3>
        <p class="text-gray-600 mb-6">Update your login password</p>
        
        <form onsubmit="${onSubmit}(event)">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <div class="relative">
                <input type="password" id="currentPassword" required
                       class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <button type="button" onclick="${onToggleVisibility}('currentPassword', this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  ${Icon('eye', { size: 'md' })}
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div class="relative">
                <input type="password" id="newPassword" required minlength="6"
                       class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <button type="button" onclick="${onToggleVisibility}('newPassword', this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  ${Icon('eye', { size: 'md' })}
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <div class="relative">
                <input type="password" id="confirmPassword" required
                       class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <button type="button" onclick="${onToggleVisibility}('confirmPassword', this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  ${Icon('eye', { size: 'md' })}
                </button>
              </div>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button type="button" onclick="${onClose}()" class="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
            <button type="submit" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20">Update Password</button>
          </div>
        </form>
      </div>
    </div>
  `;
};
