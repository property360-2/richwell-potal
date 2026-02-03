import { Toast } from '../../../components/Toast.js';

export const CartModule = {
    init(ctx) {
        this.ctx = ctx;
        this.loadFromStorage();
    },

    get state() { return this.ctx.state; },
    get storageKey() {
        return `enrollment_cart_${this.state.user?.id || 'guest'}_${this.state.activeSemester?.id || 'none'}`;
    },

    saveToStorage() {
        const data = this.state.cart.map(item => ({
            subjectId: item.subject.id,
            sectionId: item.section.id
        }));
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    },

    loadFromStorage() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                // We'll need to reconnect these IDs to full objects after data is loaded in the main script
                this.state.savedCartIds = data;
            } catch (e) {
                console.error('Failed to load cart', e);
            }
        }
    },

    addToCart(subject, section) {
        if (this.state.cart.some(item => item.subject.id === subject.id)) {
            Toast.error('Subject already in cart');
            return false;
        }

        // Check unit limits
        const currentUnits = this.getTotalUnits();
        if (currentUnits + (subject.units || 0) > (this.state.maxUnits || 24)) {
            Toast.error('Unit limit exceeded');
            return false;
        }

        this.state.cart.push({ subject, section });
        this.saveToStorage();
        Toast.success(`${subject.code} added to cart`);
        return true;
    },

    removeFromCart(subjectId) {
        this.state.cart = this.state.cart.filter(item => item.subject.id !== subjectId);
        this.saveToStorage();
        this.ctx.render();
    },

    clearCart() {
        this.state.cart = [];
        localStorage.removeItem(this.storageKey);
    },

    getTotalUnits() {
        const cartUnits = this.state.cart.reduce((sum, item) => sum + (item.subject.units || 0), 0);
        const enrolledUnits = this.state.enrolledSubjects.reduce((sum, item) => sum + (item.subject_units || 0), 0);
        return cartUnits + enrolledUnits;
    }
};
