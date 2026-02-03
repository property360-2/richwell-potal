import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { formatCurrency } from '../../../utils.js';

export const EnrollmentModals = {
    init(ctx) {
        this.ctx = ctx;
        window.openCartModal = () => this.openCartModal();
        window.showConfirmAllModal = () => this.showConfirmAllModal();
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    openCartModal() {
        const modal = new Modal({
            title: 'Your Enrollment Cart',
            content: this.getCartContent(),
            size: 'lg',
            actions: [
                { label: 'Close', onClick: (m) => m.close() },
                {
                    label: 'Enroll All Subjects',
                    primary: true,
                    onClick: (m) => {
                        m.close();
                        this.showConfirmAllModal();
                    }
                }
            ]
        });
        modal.show();
    },

    getCartContent() {
        const cart = this.state.cart;
        if (cart.length === 0) return '<div class="p-8 text-center text-gray-500">Your cart is empty.</div>';

        return `
            <div class="space-y-4">
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                    <div class="flex justify-between items-center text-sm font-bold text-blue-800">
                        <span>Total Selected Units:</span>
                        <span>${this.ctx.cart.getTotalUnits()} Units</span>
                    </div>
                </div>
                <div class="divide-y border rounded-xl overflow-hidden bg-white">
                    ${cart.map(item => `
                        <div class="p-4 flex justify-between items-center bg-white group hover:bg-gray-50 transition-colors">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">${item.subject.code}</span>
                                    <span class="text-xs font-bold text-gray-900">${item.subject.title}</span>
                                </div>
                                <div class="text-[10px] text-gray-500 font-medium">Section: ${item.section.name} • ${item.subject.units} Units</div>
                            </div>
                            <button onclick="removeFromCart('${item.subject.id}')" class="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    async showConfirmAllModal() {
        const confirmed = await ConfirmModal({
            title: 'Confirm Enrollment',
            message: `Are you sure you want to enroll in ${this.state.cart.length} subjects? This action will finalize your schedule for this semester.`,
            confirmLabel: 'Confirm Enrollment',
            primary: true
        });

        if (confirmed) {
            this.ctx.finalizeEnrollment();
        }
    }
};
