/**
 * StatCard Molecule
 * 
 * Dashboard metric card with icon, value, and label.
 * Consolidates duplicated implementations from student, professor, and admin dashboards.
 * 
 * Usage:
 *   import { renderStatCard, StatCard } from './molecules/cards/StatCard.js';
 *   
 *   const html = renderStatCard({
 *     label: 'Total Students',
 *     value: '1,234',
 *     icon: Icon('users'),
 *     color: 'blue'
 *   });
 */

import { BaseComponent, SIS } from '../../core/index.js';
import { Icon } from '../../atoms/index.js';

// Gradient color configurations
const GRADIENTS = {
  blue: 'from-blue-500 to-blue-600',
  indigo: 'from-indigo-500 to-indigo-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  pink: 'from-pink-500 to-pink-600',
  red: 'from-red-500 to-red-600',
  orange: 'from-orange-500 to-orange-600',
  teal: 'from-teal-500 to-teal-600',
  cyan: 'from-cyan-500 to-cyan-600',
  gray: 'from-gray-500 to-gray-600'
};

/**
 * Render stat card HTML
 * @param {Object} options - Card options
 * @returns {string} HTML string
 */
export function renderStatCard({
  label = '',
  value = '',
  icon = null,
  iconName = null,  // Alternative: use icon name string
  color = 'blue',
  subtitle = '',
  trend = null,     // { value: '+12%', direction: 'up' | 'down' }
  onClick = '',
  className = '',
  valueId = null
}) {
  const gradient = GRADIENTS[color] || GRADIENTS.blue;

  // Generate icon HTML
  let iconHtml = icon;
  if (!icon && iconName) {
    iconHtml = Icon(iconName, { size: 'lg' });
  }
  if (!iconHtml) {
    iconHtml = Icon('info', { size: 'lg' });
  }

  // Trend indicator
  let trendHtml = '';
  if (trend) {
    const isUp = trend.direction === 'up';
    const trendColor = isUp ? 'text-green-600' : 'text-red-600';
    const trendIcon = isUp
      ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>'
      : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>';

    trendHtml = `
      <span class="inline-flex items-center gap-0.5 text-xs ${trendColor}">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">${trendIcon}</svg>
        ${trend.value}
      </span>
    `;
  }

  const cursorClass = onClick ? 'cursor-pointer hover:shadow-lg' : '';
  const onClickAttr = onClick ? `onclick="${onClick}"` : '';

  return `
    <div class="card ${cursorClass} transition-shadow ${className}" ${onClickAttr}>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
          ${iconHtml}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-500 truncate">${label}</p>
          <div class="flex items-center gap-2">
            <p class="text-lg font-bold text-gray-800 truncate" ${valueId ? `id="${valueId}"` : ''}>${value}</p>
            ${trendHtml}
          </div>
          ${subtitle ? `<p class="text-xs text-gray-400 mt-0.5 truncate">${subtitle}</p>` : ''}
        </div>
      </div>
    </div>
  `.trim();
}

/**
 * Render a row of stat cards
 * @param {Array} cards - Array of card options
 * @param {Object} options - Grid options
 * @returns {string} HTML string
 */
export function renderStatCardGrid(cards, { columns = 4, className = '' } = {}) {
  const colClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-3 lg:grid-cols-5',
    6: 'md:grid-cols-3 lg:grid-cols-6'
  }[columns] || 'md:grid-cols-4';

  return `
    <div class="grid grid-cols-1 ${colClass} gap-6 ${className}">
      ${cards.map(card => renderStatCard(card)).join('')}
    </div>
  `.trim();
}

/**
 * StatCard Component Class
 */
export class StatCard extends BaseComponent {
  init() {
    this.render();
  }

  render() {
    // Component replaces itself with card content
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderStatCard(this.props);

    // Copy attributes and content
    const card = wrapper.firstElementChild;
    this.el.className = card.className;
    this.el.innerHTML = card.innerHTML;

    this.attachListeners();
  }

  attachListeners() {
    if (this.props.onClick && typeof this.props.onClick === 'function') {
      this.on(this.el, 'click', this.props.onClick);
    }
  }

  setValue(value) {
    const valueEl = this.el.querySelector('.text-lg.font-bold');
    if (valueEl) valueEl.textContent = value;
  }
}

// Register with SIS
SIS.register('StatCard', StatCard);

export default StatCard;
