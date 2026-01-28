/**
 * BaseComponent
 * 
 * Abstract base class for all SIS components.
 * Provides lifecycle methods, state management, and event handling.
 * 
 * Usage:
 *   import { BaseComponent } from './core/BaseComponent.js';
 *   
 *   export class MyComponent extends BaseComponent {
 *     init() {
 *       this.state = { count: 0 };
 *       this.render();
 *     }
 *     
 *     render() {
 *       this.el.innerHTML = `<div>${this.state.count}</div>`;
 *       this.attachListeners();
 *     }
 *   }
 */

import { SIS } from './SIS.js';

export class BaseComponent {
    /**
     * @param {HTMLElement} element - DOM element to mount on
     * @param {Object} props - Component configuration (from data-sis-props)
     */
    constructor(element, props = {}) {
        this.el = element;
        this.props = props;
        this.state = {};
        this._eventCleanup = [];
        this._mounted = false;

        // Mark element as initialized
        this.el.dataset.sisInitialized = 'true';

        // Call init (override in subclass)
        this.init();
        this._mounted = true;
    }

    /**
     * Initialize component (override in subclass)
     * Called once during construction
     */
    init() {
        // Override in subclass
    }

    /**
     * Render component (override in subclass)
     * Called whenever state changes
     */
    render() {
        // Override in subclass
    }

    /**
     * Attach event listeners after render (override in subclass)
     * Use this.on() for automatic cleanup
     */
    attachListeners() {
        // Override in subclass
    }

    /**
     * Update component state and trigger re-render
     * @param {Object} newState - State updates (merged with existing)
     */
    setState(newState) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };

        // Only render if mounted
        if (this._mounted) {
            this.render();
            this.attachListeners();
        }

        // Lifecycle hook
        this.onStateChange(prevState, this.state);
    }

    /**
     * Called after state changes (override for side effects)
     * @param {Object} prevState - Previous state
     * @param {Object} newState - New state
     */
    onStateChange(prevState, newState) {
        // Override in subclass
    }

    /**
     * Add event listener with automatic cleanup
     * @param {HTMLElement|string} target - Element or selector
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - addEventListener options
     */
    on(target, event, handler, options = {}) {
        const el = typeof target === 'string'
            ? this.el.querySelector(target)
            : target;

        if (!el) {
            if (SIS.debug) {
                console.warn(`[BaseComponent] Target not found for event: ${event}`, target);
            }
            return;
        }

        const boundHandler = handler.bind(this);
        el.addEventListener(event, boundHandler, options);

        // Store for cleanup
        this._eventCleanup.push(() => {
            el.removeEventListener(event, boundHandler, options);
        });
    }

    /**
     * Add delegated event listener (handles dynamic content)
     * @param {string} event - Event name
     * @param {string} selector - CSS selector for delegation
     * @param {Function} handler - Event handler
     */
    delegate(event, selector, handler) {
        const delegatedHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && this.el.contains(target)) {
                handler.call(this, e, target);
            }
        };

        this.el.addEventListener(event, delegatedHandler);
        this._eventCleanup.push(() => {
            this.el.removeEventListener(event, delegatedHandler);
        });
    }

    /**
     * Subscribe to global SIS events with automatic cleanup
     * @param {string} eventName - Global event name
     * @param {Function} handler - Event handler
     */
    subscribe(eventName, handler) {
        const unsubscribe = SIS.on(eventName, handler.bind(this));
        this._eventCleanup.push(unsubscribe);
    }

    /**
     * Emit event from this component (bubbles up)
     * @param {string} eventName - Event name
     * @param {*} detail - Event payload
     */
    emit(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            composed: true
        });
        this.el.dispatchEvent(event);
    }

    /**
     * Find element within component
     * @param {string} selector - CSS selector
     * @returns {HTMLElement|null}
     */
    $(selector) {
        return this.el.querySelector(selector);
    }

    /**
     * Find all elements within component
     * @param {string} selector - CSS selector
     * @returns {NodeList}
     */
    $$(selector) {
        return this.el.querySelectorAll(selector);
    }

    /**
     * Get data attribute from element
     * @param {string} name - Attribute name (without data- prefix)
     * @returns {string|null}
     */
    data(name) {
        return this.el.dataset[name] || null;
    }

    /**
     * Show loading state
     * @param {boolean} show - Show or hide loading
     */
    setLoading(show) {
        this.el.classList.toggle('is-loading', show);
        this.el.setAttribute('aria-busy', show ? 'true' : 'false');
    }

    /**
     * Destroy component and cleanup
     */
    destroy() {
        // Run all cleanup functions
        this._eventCleanup.forEach(cleanup => cleanup());
        this._eventCleanup = [];

        // Remove initialization marker
        delete this.el.dataset.sisInitialized;

        // Clear content
        this.el.innerHTML = '';

        this._mounted = false;

        // Lifecycle hook
        this.onDestroy();
    }

    /**
     * Called when component is destroyed (override for cleanup)
     */
    onDestroy() {
        // Override in subclass
    }

    /**
     * Helper to create HTML from string
     * @param {string} html - HTML string
     * @returns {DocumentFragment}
     */
    createFragment(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content;
    }

    /**
     * Safe HTML escaping
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
}

export default BaseComponent;
