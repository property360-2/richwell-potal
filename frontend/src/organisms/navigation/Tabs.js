/**
 * Tabs Organism
 * 
 * Tab navigation with content switching.
 */

import { BaseComponent, SIS } from '../../core/index.js';

/**
 * Render tabs HTML
 */
export function renderTabs({
    tabs = [],          // [{ id, label, icon?, badge?, disabled? }]
    activeTab = '',
    onTabChange = '',   // Function name
    variant = 'default', // 'default' | 'pills' | 'underline'
    className = ''
}) {
    const styles = {
        default: {
            container: 'border-b border-gray-200',
            tab: 'py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
            active: 'border-blue-500 text-blue-600',
            inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        },
        pills: {
            container: 'bg-gray-100 p-1 rounded-xl',
            tab: 'py-2 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-all',
            active: 'bg-white text-gray-900 shadow-sm',
            inactive: 'text-gray-500 hover:text-gray-700'
        },
        underline: {
            container: '',
            tab: 'py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap',
            active: 'border-blue-500 text-blue-600',
            inactive: 'border-transparent text-gray-500 hover:text-gray-700'
        }
    };
    const s = styles[variant] || styles.default;

    const tabsHtml = tabs.map(tab => {
        const isActive = tab.id === activeTab;
        const disabled = tab.disabled ? 'opacity-50 cursor-not-allowed' : '';
        const click = !tab.disabled && onTabChange ? `onclick="${onTabChange}('${tab.id}')"` : '';

        const iconHtml = tab.icon ? `<span class="mr-2">${tab.icon}</span>` : '';
        const badgeHtml = tab.badge !== undefined ? `
      <span class="ml-2 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'}">
        ${tab.badge}
      </span>
    ` : '';

        return `
      <button
        type="button"
        class="${s.tab} ${isActive ? s.active : s.inactive} ${disabled}"
        ${click}
        ${tab.disabled ? 'disabled' : ''}
        role="tab"
        aria-selected="${isActive}"
        aria-controls="panel-${tab.id}"
      >
        ${iconHtml}${tab.label}${badgeHtml}
      </button>
    `;
    }).join('');

    return `
    <nav class="${s.container} ${className}" role="tablist">
      <div class="flex ${variant === 'pills' ? 'gap-1' : 'gap-8'}">
        ${tabsHtml}
      </div>
    </nav>
  `.trim();
}

/**
 * Tabs Component Class
 */
export class Tabs extends BaseComponent {
    init() {
        this.state = {
            activeTab: this.props.activeTab || this.props.tabs?.[0]?.id || ''
        };

        const id = this.el.id || `tabs-${Date.now()}`;
        this.el.id = id;
        window[`${id}_change`] = this.handleChange.bind(this);

        this.render();
    }

    render() {
        this.el.innerHTML = renderTabs({
            ...this.props,
            activeTab: this.state.activeTab,
            onTabChange: `${this.el.id}_change`
        });
    }

    handleChange(tabId) {
        if (tabId === this.state.activeTab) return;

        this.state.activeTab = tabId;
        this.render();
        this.emit('change', { tab: tabId });

        // Update URL hash if enabled
        if (this.props.useHash) {
            window.location.hash = tabId;
        }
    }

    setActiveTab(tabId) {
        this.handleChange(tabId);
    }

    getActiveTab() {
        return this.state.activeTab;
    }
}

// Register with SIS
SIS.register('Tabs', Tabs);

export default Tabs;
