import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';

export const RoomsModule = {
    init(ctx) {
        this.ctx = ctx;
        window.handleRoomSearch = (q) => this.handleRoomSearch(q);
        window.openAddRoomModal = () => this.openAddRoomModal();
        window.openEditRoomModal = (id) => this.openEditRoomModal(id);
        window.deleteRoom = (id) => this.deleteRoom(id);
        window.viewRoomSchedule = (name) => this.viewRoomSchedule(name);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderRoomsTab() {
        const filteredRooms = this.state.rooms.filter(r =>
            r.name.toLowerCase().includes(this.state.roomSearch.toLowerCase())
        );

        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div class="relative flex-1">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </span>
                    <input type="text" id="room-search" placeholder="Search rooms..." 
                        class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        value="${this.state.roomSearch}" oninput="handleRoomSearch(this.value)">
                </div>
                <button onclick="openAddRoomModal()" class="btn btn-primary flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Add Room
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                ${filteredRooms.length === 0 ? `
                    <div class="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <p class="text-gray-500">No rooms found</p>
                    </div>
                ` : filteredRooms.map(r => `
                    <div class="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group overflow-hidden relative">
                        <div class="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button onclick="viewRoomSchedule('${r.name}')" class="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="View Weekly Schedule">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            </button>
                            <button onclick="openEditRoomModal('${r.id}')" class="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button onclick="deleteRoom('${r.id}')" class="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                        <div class="flex items-start gap-4 mb-4">
                            <div class="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                <svg class="w-6 h-6 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            </div>
                            <div>
                                <h3 class="font-bold text-gray-900">${r.name}</h3>
                                <p class="text-xs text-gray-500 uppercase font-bold mt-0.5">${r.room_type}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-6 mt-6">
                            <div><p class="text-[10px] font-black text-gray-400 uppercase mb-0.5">Capacity</p><span class="text-sm font-bold text-gray-700">${r.capacity}</span></div>
                            <div><p class="text-[10px] font-black text-gray-400 uppercase mb-0.5">Status</p><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${r.is_active ? 'ACTIVE' : 'INACTIVE'}</span></div>
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
            title: 'Add New Room',
            content: this.getRoomForm(),
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Create Room', primary: true,
                    onClick: async (m) => {
                        const form = document.getElementById('room-form');
                        if (!form.checkValidity()) { form.reportValidity(); return; }
                        const data = {
                            name: document.getElementById('room-name').value,
                            capacity: parseInt(document.getElementById('room-capacity').value),
                            room_type: document.getElementById('room-type').value,
                            is_active: document.getElementById('room-active').checked
                        };
                        try {
                            await api.post(endpoints.rooms, data);
                            Toast.success('Room created successfully');
                            m.close();
                            await this.ctx.loadRooms();
                            this.render();
                        } catch (e) { ErrorHandler.handle(e, 'Creating room'); }
                    }
                }
            ]
        });
        modal.show();
    },

    async openEditRoomModal(roomId) {
        try {
            const room = await api.get(endpoints.room(roomId));
            const modal = new Modal({
                title: 'Edit Room',
                content: this.getRoomForm(room),
                actions: [
                    { label: 'Cancel', onClick: (m) => m.close() },
                    {
                        label: 'Save Changes', primary: true,
                        onClick: async (m) => {
                            const form = document.getElementById('room-form');
                            if (!form.checkValidity()) { form.reportValidity(); return; }
                            const data = {
                                name: document.getElementById('room-name').value,
                                capacity: parseInt(document.getElementById('room-capacity').value),
                                room_type: document.getElementById('room-type').value,
                                is_active: document.getElementById('room-active').checked
                            };
                            try {
                                await api.patch(endpoints.room(roomId), data);
                                Toast.success('Room updated successfully');
                                m.close();
                                await this.ctx.loadRooms();
                                this.render();
                            } catch (e) { ErrorHandler.handle(e, 'Updating room'); }
                        }
                    }
                ]
            });
            modal.show();
        } catch (e) { ErrorHandler.handle(e, 'Loading room'); }
    },

    deleteRoom(roomId) {
        ConfirmModal({
            title: 'Delete Room', message: 'Are you sure?', danger: true,
            onConfirm: async () => {
                try {
                    await api.delete(endpoints.room(roomId));
                    Toast.success('Room deleted');
                    await this.ctx.loadRooms();
                    this.render();
                } catch (e) { ErrorHandler.handle(e, 'Deleting room'); }
            }
        });
    },

    getRoomForm(room = null) {
        return `
            <form id="room-form" class="space-y-4">
              <div><label class="block text-sm font-medium">Room Name *</label><input type="text" id="room-name" value="${room?.name || ''}" required class="form-input"></div>
              <div class="grid grid-cols-2 gap-4">
                  <div><label class="block text-sm font-medium">Capacity *</label><input type="number" id="room-capacity" value="${room?.capacity || 40}" required class="form-input"></div>
                  <div><label class="block text-sm font-medium">Room Type *</label>
                      <select id="room-type" class="form-select">
                          <option value="LECTURE" ${room?.room_type === 'LECTURE' ? 'selected' : ''}>Lecture Room</option>
                          <option value="LABORATORY" ${room?.room_type === 'LABORATORY' ? 'selected' : ''}>Laboratory</option>
                      </select>
                  </div>
              </div>
              <label class="flex items-center gap-2"><input type="checkbox" id="room-active" ${room ? (room.is_active ? 'checked' : '') : 'checked'}> Room is active</label>
            </form>
        `;
    },

    async viewRoomSchedule(roomName) {
        const modal = new Modal({ title: `Schedule for ${roomName}`, content: `<div class="p-8 text-center">Loading...</div>`, size: 'full' });
        modal.show();
        try {
            const semId = this.state.activeSemester?.id;
            const slots = await api.get(`${endpoints.scheduleSlots}?room=${encodeURIComponent(roomName)}&semester=${semId}`);
            modal.setContent(`<div class="p-6 bg-gray-50 overflow-x-auto">${this.ctx.renderRoomScheduleGrid(slots.results || slots)}</div>`);
        } catch (e) { modal.setContent('<div class="p-8 text-center text-red-500">Error</div>'); }
    }
};
