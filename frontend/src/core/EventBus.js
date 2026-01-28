/**
 * EventBus
 * 
 * Lightweight pub/sub event bus for cross-component communication.
 * Use for loose coupling between components that don't have direct references.
 * 
 * Usage:
 *   import { EventBus } from './core/EventBus.js';
 *   
 *   // Subscribe
 *   const unsubscribe = EventBus.on('cart:updated', (data) => {
 *     console.log('Cart was updated:', data);
 *   });
 *   
 *   // Publish
 *   EventBus.emit('cart:updated', { items: [...] });
 *   
 *   // Unsubscribe
 *   unsubscribe();
 */

class EventBusClass {
    constructor() {
        this.events = {};
        this.debug = false;
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name (use namespace:action format)
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }

        this.events[event].push(callback);

        if (this.debug) {
            console.log(`[EventBus] Subscribed to: ${event}`);
        }

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event only once
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(event, callback) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event].filter(cb => cb !== callback);

        if (this.events[event].length === 0) {
            delete this.events[event];
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event payload
     */
    emit(event, data) {
        if (this.debug) {
            console.log(`[EventBus] Emit: ${event}`, data);
        }

        if (!this.events[event]) return;

        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Error in handler for ${event}:`, error);
            }
        });
    }

    /**
     * Remove all listeners for an event (or all events)
     * @param {string} [event] - Event name (optional, clears all if not provided)
     */
    clear(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }

    /**
     * Get count of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Listener count
     */
    listenerCount(event) {
        return this.events[event]?.length || 0;
    }

    /**
     * Enable debug logging
     */
    enableDebug() {
        this.debug = true;
    }

    /**
     * Disable debug logging
     */
    disableDebug() {
        this.debug = false;
    }
}

// Singleton instance
export const EventBus = new EventBusClass();

export default EventBus;
