/**
 * QuickActionCard Component
 * A clickable card component used for dashboard quick actions
 */

/**
 * Render a quick action card
 * @param {Object} props - Card properties
 * @param {string} props.href - Link destination
 * @param {string} props.title - Action title
 * @param {string} props.description - Action description
 * @param {string} props.icon - SVG path content
 * @param {string} props.iconColor - Tailwind color class for icon (e.g., 'text-blue-600')
 * @returns {string} HTML string
 */
export const renderQuickActionCard = ({ href, title, description, icon, iconColor = 'text-blue-600' }) => {
    return `
        <a href="${href}" class="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 transition-colors duration-200">
            <div class="flex-shrink-0">
                <svg class="h-10 w-10 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${icon}
                </svg>
            </div>
            <div class="flex-1 min-w-0">
                <span class="absolute inset-0" aria-hidden="true"></span>
                <p class="text-sm font-medium text-gray-900">${title}</p>
                <p class="text-sm text-gray-500">${description}</p>
            </div>
        </a>
    `;
};

/**
 * Render a grid of quick action cards
 * @param {Array<Object>} actions - Array of action objects
 * @returns {string} HTML string
 */
export const renderQuickActionGrid = (actions) => {
    return `
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            ${actions.map(action => renderQuickActionCard(action)).join('')}
        </div>
    `;
};
