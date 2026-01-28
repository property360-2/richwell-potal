/**
 * SIS Global Namespace
 * 
 * Central registry for the Student Information System frontend.
 * Provides component registration, global state, and event bus.
 * 
 * Usage:
 *   import { SIS } from './core/SIS.js';
 *   
 *   // Register a component
 *   SIS.register('DataTable', DataTableComponent);
 *   
 *   // Emit global event
 *   SIS.emit('enrollment:updated', { studentId: 123 });
 *   
 *   // Subscribe to events
 *   SIS.on('enrollment:updated', (e) => console.log(e.detail));
 */

class SISNamespace {
    constructor() {
        this.version = '1.0.0';

        // Component registry
        this.components = {};

        // Global state (minimal - prefer local component state)
        this.state = {
            user: null,
            activeSemester: null,
            config: {}
        };

        // Event bus for cross-component communication
        this.events = new EventTarget();

        // API client reference (set during app init)
        this.api = null;

        // Debug mode
        this.debug = localStorage.getItem('SIS_DEBUG') === 'true';
    }

    /**
     * Register a component class
     * @param {string} name - Component name (used in data-sis-component)
     * @param {Function} Component - Component class
     */
    register(name, Component) {
        if (this.components[name] && this.debug) {
            console.warn(`[SIS] Component "${name}" is being overwritten`);
        }
        this.components[name] = Component;

        if (this.debug) {
            console.log(`[SIS] Registered component: ${name}`);
        }
    }

    /**
     * Get a registered component
     * @param {string} name - Component name
     * @returns {Function|null} Component class or null
     */
    get(name) {
        return this.components[name] || null;
    }

    /**
     * Emit a global event
     * @param {string} eventName - Event name (use namespace:action format)
     * @param {*} detail - Event payload
     */
    emit(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        this.events.dispatchEvent(event);

        if (this.debug) {
            console.log(`[SIS] Event emitted: ${eventName}`, detail);
        }
    }

    /**
     * Subscribe to a global event
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(eventName, handler) {
        this.events.addEventListener(eventName, handler);

        // Return unsubscribe function
        return () => this.events.removeEventListener(eventName, handler);
    }

    /**
     * One-time event subscription
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     */
    once(eventName, handler) {
        this.events.addEventListener(eventName, handler, { once: true });
    }

    /**
     * Set global state
     * @param {string} key - State key
     * @param {*} value - State value
     */
    setState(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;

        // Emit state change event
        this.emit('state:changed', { key, oldValue, newValue: value });
    }

    /**
     * Get global state
     * @param {string} key - State key
     * @returns {*} State value
     */
    getState(key) {
        return this.state[key];
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
        this.debug = true;
        localStorage.setItem('SIS_DEBUG', 'true');
        console.log('[SIS] Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disableDebug() {
        this.debug = false;
        localStorage.removeItem('SIS_DEBUG');
    }

    /**
     * List all registered components
     * @returns {string[]} Component names
     */
    listComponents() {
        return Object.keys(this.components);
    }
}

// Create singleton instance
export const SIS = new SISNamespace();

// Expose globally for debugging and legacy code compatibility
window.SIS = SIS;

export default SIS;
