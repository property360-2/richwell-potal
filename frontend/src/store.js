/**
 * Simple Global Store
 * Observable state management for syncing UI across components
 */

class Store {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = [];
    }

    /**
     * Get a piece of state
     */
    get(key) {
        return key ? this.state[key] : this.state;
    }

    /**
     * Update state and notify listeners
     */
    set(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    /**
     * Update a specific key
     */
    update(key, value) {
        this.state[key] = value;
        this.notify();
    }

    /**
     * Add a listener that triggers on state change
     */
    subscribe(callback) {
        this.listeners.push(callback);
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    notify() {
        this.listeners.forEach(callback => callback(this.state));
    }
}

// Export a singleton instance
export const store = new Store({
    user: null,
    activeSemester: null,
    loading: false,
    notifications: []
});
