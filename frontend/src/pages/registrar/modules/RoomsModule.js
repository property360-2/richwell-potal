import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { UI } from '../../../components/UI.js';
import { Validator } from '../../../utils/validation.js';

/**
 * Rooms Module for Registrar Academic Page
 * Refactored using Atomic UI Components & Validation Utility
 */
export const RoomsModule = {
    init(ctx) {
        this.ctx = ctx;
        // Register Global Handlers
        window.handleRoomSearch = (q) => this.handleRoomSearch(q);
        window.openAddRoomModal = () => this.openAddRoomModal();
        window.openEditRoomModal = (id) => this.openEditRoomModal(id);
        window.deleteRoom = (id) => this.deleteRoom(id);
        window.viewRoomSchedule = (name) => this.viewRoomSchedule(name);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderRoomsTab() {
        const filtered = this.state.rooms.filter(r =>
            r.name.toLowerCase().includes(this.state.roomSearch.toLowerCase())
        );

        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-black text-gray-800">Facility Management</h2>
                    <p class="text-sm text-gray-500 font-medium">Manage classrooms, laboratories, and venue schedules</p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="relative group">
                        <input type="text" id="room-search" placeholder="Search rooms..." 
                               class="w-64 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                               value="${this.state.roomSearch}" 
                               oninput="handleRoomSearch(this.value)">
                        <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    ${UI.button({
            label: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> Add Room',
            onClick: 'openAddRoomModal()'
        })}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                ${filtered.length === 0 ? `
                    <div class="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <p class="text-gray-400 font-black uppercase tracking-widest text-xs">No matching facilities found</p>
                    </div>
                ` : filtered.map(r => `
                    <div class="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden">
                        <div class="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 flex gap-2">
                            <button onclick="viewRoomSchedule('${r.name}')" class="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 hover:scale-110 active:scale-95 transition-all" title="View Schedule">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            </button>
                            <button onclick="openEditRoomModal('${r.id}')" class="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 hover:scale-110 active:scale-95 transition-all">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button onclick="deleteRoom('${r.id}')" class="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 hover:scale-110 active:scale-95 transition-all">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                        <div class="flex items-start gap-4 mb-4">
                            <div class="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 group-hover:ring-4 group-hover:ring-blue-500/10 transition-all duration-300">
                                <svg class="w-6 h-6 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            </div>
                            <div>
                                <h3 class="font-black text-gray-900 group-hover:text-blue-600 transition-colors">${r.name}</h3>
                                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">${r.room_type}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-6 mt-6 pt-4 border-t border-gray-50">
                            <div>
                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Capacity</p>
                                <span class="text-sm font-black text-gray-700">${r.capacity} Seats</span>
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Status</p>
                                ${UI.badge(r.is_active ? 'Active' : 'Offline', r.is_active ? 'success' : 'danger')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    handleRoomSearch(query) {
        this.ctx.state.roomSearch = query;
        this.render();
        const input = document.getElementById('room-search');
        if (input) { input.focus(); input.setSelectionRange(query.length, query.length); }
    },

    openAddRoomModal() {
        const modal = new Modal({
            title: 'Add New Facility',
            content: this.getRoomForm(),
            size: 'md',
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                { label: 'Create Facility', primary: true, onClick: async (m) => await this.handleSubmit(m) }
            ]
        });
        modal.show();
    },

    async openEditRoomModal(id) {
        try {
            const room = await api.get(endpoints.room(id));
            const modal = new Modal({
                title: 'Edit Facility Details',
                content: this.getRoomForm(room),
                size: 'md',
                actions: [
                    { label: 'Cancel', onClick: (m) => m.close() },
                    { label: 'Save Changes', primary: true, onClick: async (m) => await this.handleSubmit(m, id) }
                ]
            });
            modal.show();
        } catch (e) { ErrorHandler.handle(e); }
    },

    getRoomForm(r = null) {
        return `
            <form id="room-form" class="space-y-6 p-2">
                ${UI.field({ label: 'Facility Name', id: 'f-name', value: r?.name || '', placeholder: 'e.g. Room 401, Lab A', required: true })}
                <div class="grid grid-cols-2 gap-6">
                    ${UI.field({ label: 'Capacity', id: 'f-cap', type: 'number', value: r?.capacity || 40, required: true })}
                    ${UI.field({
            label: 'Room Type',
            id: 'f-type',
            type: 'select',
            value: r?.room_type || 'LECTURE',
            options: [
                { value: 'LECTURE', label: 'Lecture Room' },
                { value: 'LABORATORY', label: 'Laboratory' }
            ]
        })}
                </div>
                <div class="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <input type="checkbox" id="f-active" ${r ? (r.is_active ? 'checked' : '') : 'checked'} class="w-5 h-5 rounded-md border-gray-300 text-blue-600">
                    <div>
                        <div class="font-bold text-gray-800 text-sm">Active & Schedulable</div>
                        <div class="text-[10px] text-gray-400 uppercase font-black tracking-widest">Controls availability in scheduling</div>
                    </div>
                </div>
            </form>
        `;
    },

    async handleSubmit(modal, id = null) {
        this.clearFormErrors(['f-name', 'f-cap']);

        const data = {
            name: document.getElementById('f-name').value.trim(),
            capacity: parseInt(document.getElementById('f-cap').value),
            room_type: document.getElementById('f-type').value,
            is_active: document.getElementById('f-active').checked
        };

        const { isValid, errors } = Validator.validate(data, {
            name: [Validator.required, Validator.minLength(2)],
            capacity: [Validator.required]
        });

        if (!isValid) {
            let firstErrorId = null;
            Object.entries(errors).forEach(([field, msg]) => {
                const fieldId = field === 'name' ? 'f-name' : 'f-cap';
                this.showFieldError(fieldId, msg);
                if (!firstErrorId) firstErrorId = fieldId;
            });

            if (firstErrorId) {
                const el = document.getElementById(firstErrorId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => el.focus(), 500);
                }
            }
            Toast.error('Please fix the errors in the form');
            return;
        }

        try {
            if (id) await api.patch(endpoints.room(id), data);
            else await api.post(endpoints.rooms, data);

            Toast.success(id ? 'Facility updated' : 'Facility added');
            modal.close();
            await this.ctx.loadRooms();
            this.render();
        } catch (e) {
            if (e.data && typeof e.data === 'object') {
                Object.entries(e.data).forEach(([field, msgs]) => {
                    const fieldId = field === 'name' ? 'f-name' : (field === 'capacity' ? 'f-cap' : null);
                    if (fieldId) {
                        this.showFieldError(fieldId, Array.isArray(msgs) ? msgs[0] : msgs);
                    }
                });
            }
            ErrorHandler.handle(e);
        }
    },

    showFieldError(id, message) {
        const input = document.getElementById(id);
        const errorDiv = document.getElementById(`error-${id}`) || this.createErrorDiv(id);

        if (input) {
            input.classList.remove('border-gray-200', 'bg-gray-50');
            input.classList.add('border-red-400', 'bg-red-50/30');
        }

        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    },

    clearFormErrors(ids) {
        ids.forEach(id => {
            const input = document.getElementById(id);
            const errorDiv = document.getElementById(`error-${id}`);

            if (input) {
                input.classList.remove('border-red-400', 'bg-red-50/30');
                input.classList.add('border-gray-200', 'bg-gray-50');
            }

            if (errorDiv) {
                errorDiv.classList.add('hidden');
            }
        });
    },

    createErrorDiv(id) {
        const input = document.getElementById(id);
        if (!input) return null;

        const div = document.createElement('div');
        div.id = `error-${id}`;
        div.className = 'text-[10px] text-red-500 font-bold mt-1 animate-in fade-in slide-in-from-top-1 duration-200';
        input.parentNode.appendChild(div);
        return div;
    },

    deleteRoom(id) {
        ConfirmModal({
            title: 'Delete Facility', message: 'This will remove the room and its scheduling history. Continue?', danger: true,
            onConfirm: async () => {
                try {
                    await api.delete(endpoints.room(id));
                    Toast.success('Facility removed');
                    await this.ctx.loadRooms();
                    this.render();
                } catch (e) { ErrorHandler.handle(e); }
            }
        });
    },

    async viewRoomSchedule(name) {
        const modal = new Modal({
            title: `Weekly Schedule: ${name}`,
            content: `<div class="flex flex-col items-center justify-center p-20">${UI.badge('Scanning Schedule...', 'info')}</div>`,
            size: 'full'
        });
        modal.show();
        try {
            const semId = this.state.activeSemester?.id;
            const slots = await api.get(`${endpoints.scheduleSlots}?room=${encodeURIComponent(name)}&semester=${semId}`);
            modal.setContent(`<div class="p-6 bg-gray-50/50 min-h-[500px] overflow-auto">${this.ctx.renderRoomScheduleGrid(slots)}</div>`);
        } catch (e) {
            modal.setContent(`<div class="p-20 text-center text-red-500 font-bold">Failed to load schedule.</div>`);
        }
    }
};
