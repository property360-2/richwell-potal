import React, { useState, useEffect } from 'react';
import { 
    Building2, 
    Plus, 
    Search, 
    Edit, 
    Trash2, 
    Loader2,
    Filter,
    Users,
    MapPin,
    Monitor,
    BookOpen,
    CheckCircle,
    XCircle,
    Eye
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { FacilitiesService } from '../services/FacilitiesService';
import { useToast } from '../../../context/ToastContext';
import AddRoomModal from '../modals/AddRoomModal';
import EditRoomModal from '../modals/EditRoomModal';
import ViewRoomModal from '../modals/ViewRoomModal';

const FacilitiesTab = () => {
    const { success: showSuccess, error: showError } = useToast();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    
    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWIPModalOpen, setIsWIPModalOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const params = {
                search: searchQuery,
                room_type: typeFilter,
            };
            
            if (statusFilter !== 'all') {
                params.is_active = statusFilter === 'active';
            }
            
            // Remove empty params
            Object.keys(params).forEach(key => !params[key] && delete params[key]);
            
            const data = await FacilitiesService.getRooms(params);
            setRooms(data);
        } catch (err) {
            console.error(err);
            showError('Failed to load campus rooms.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchRooms, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, typeFilter, statusFilter]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this room?')) return;
        
        try {
            await FacilitiesService.deleteRoom(id);
            showSuccess('Room deleted successfully');
            fetchRooms();
        } catch (err) {
            showError('Failed to delete room');
        }
    };

    const toggleStatus = async (room) => {
        try {
            await FacilitiesService.toggleRoomStatus(room.id, !room.is_active);
            showSuccess(`Room ${room.is_active ? 'deactivated' : 'activated'} successfully`);
            fetchRooms();
        } catch (err) {
            showError('Failed to update room status');
        }
    };

    const openEditModal = (room) => {
        setSelectedRoom(room);
        setIsEditModalOpen(true);
    };

    const openViewModal = (room) => {
        setSelectedRoom(room);
        setIsWIPModalOpen(true);
    };

    const getRoomIcon = (type) => {
        switch (type) {
            case 'COMPUTER_LAB':
            case 'LABORATORY': return <Monitor size={20} />;
            case 'LECTURE': return <BookOpen size={20} />;
            default: return <Building2 size={20} />;
        }
    };

    const getRoomTypeLabel = (type) => {
        switch (type) {
            case 'COMPUTER_LAB':
            case 'LABORATORY': return 'Computer Lab';
            case 'LECTURE': return 'Lecture Room';
            default: return 'Other';
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
                        <Building2 size={28} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Facilities Management</h2>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Institutional Repository of Campus Infrastructure</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative group flex-grow lg:flex-grow-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input 
                            type="text"
                            placeholder="Search room name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-900 text-sm font-bold rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full lg:w-80 pl-12 pr-6 py-4 shadow-sm transition-all outline-none"
                        />
                    </div>
                    <Button 
                        variant="primary" 
                        onClick={() => setIsAddModalOpen(true)}
                        className="rounded-2xl px-8 py-4 h-auto shadow-xl shadow-indigo-100 flex items-center gap-2 shrink-0 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 border-none group transition-all"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-black uppercase tracking-widest text-[11px]">Register New Room</span>
                    </Button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="bg-white rounded-[28px] border border-gray-100 p-5 mb-8 flex flex-wrap items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2.5 px-4 py-2.5 text-indigo-600 bg-indigo-50 rounded-2xl mr-2">
                    <Filter size={18} />
                    <span className="text-[11px] font-black uppercase tracking-widest leading-none">Filters</span>
                </div>

                {/* Type Filter */}
                <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-gray-50 border-none text-gray-700 text-[11px] font-black uppercase tracking-widest rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[180px]"
                >
                    <option value="">All Room Types</option>
                    <option value="LECTURE">Lecture Rooms</option>
                    <option value="COMPUTER_LAB">Computer Labs</option>
                </select>

                {/* Status Filter */}
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-gray-50 border-none text-gray-700 text-[11px] font-black uppercase tracking-widest rounded-2xl px-5 py-3 focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[140px]"
                >
                    <option value="all">Any Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                </select>

                {/* Reset */}
                {(searchQuery || typeFilter || statusFilter !== 'all') && (
                    <button 
                        onClick={() => {
                            setSearchQuery('');
                            setTypeFilter('');
                            setStatusFilter('all');
                        }}
                        className="ml-auto text-indigo-600 hover:text-indigo-700 text-[10px] font-black uppercase tracking-widest px-5 py-3 hover:bg-indigo-50 rounded-2xl transition-all"
                    >
                        Reset All
                    </button>
                )}
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-gray-100 shadow-sm">
                    <Loader2 className="text-indigo-600 animate-spin mb-4" size={48} />
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Loading campus rooms...</p>
                </div>
            ) : rooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {rooms.map(room => (
                        <div key={room.id} className={`group bg-white rounded-[32px] border ${room.is_active ? 'border-gray-100' : 'border-red-100 bg-red-50/10'} p-8 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 relative overflow-hidden`}>
                            {/* Decorative Background Element */}
                            <div className={`absolute -right-4 -top-4 w-24 h-24 ${room.is_active ? 'bg-indigo-50/50' : 'bg-red-50/50'} rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700`}></div>
                            
                            <div className="relative flex flex-col h-full">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 ${room.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'} rounded-xl flex items-center justify-center`}>
                                            {getRoomIcon(room.room_type)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase italic tracking-tighter">{room.name}</h3>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5 block">
                                                {getRoomTypeLabel(room.room_type)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => openViewModal(room)}
                                            title="View Details"
                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button 
                                            onClick={() => openEditModal(room)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => toggleStatus(room)}
                                            title={room.is_active ? 'Deactivate Room' : 'Activate Room'}
                                            className={`p-2 ${room.is_active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'} rounded-xl transition-all`}
                                        >
                                            {room.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-auto pt-6 border-t border-gray-50">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-gray-400">
                                            <Users size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Capacity</span>
                                        </div>
                                        <p className="text-sm font-black text-gray-700">
                                            {room.capacity} Seats
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <Button 
                                            variant="secondary"
                                            onClick={() => openViewModal(room)}
                                            className="w-full py-2 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border-none rounded-xl text-[10px] h-auto font-black uppercase tracking-widest group/btn"
                                        >
                                            View Room
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200">
                    <div className="p-6 bg-white rounded-[24px] shadow-sm mb-6">
                        <Building2 size={48} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">No Rooms Found</h3>
                    <p className="text-gray-500 text-sm font-medium mb-8">Try adjusting your filters or create a new room.</p>
                    <Button 
                        variant="primary" 
                        onClick={() => setIsAddModalOpen(true)}
                        className="rounded-2xl px-10 shadow-lg shadow-indigo-100 bg-indigo-600 border-none"
                    >
                        Register New Room
                    </Button>
                </div>
            )}

            {/* Modals */}
            {isAddModalOpen && (
                <AddRoomModal 
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchRooms();
                        showSuccess('Room registered successfully!');
                    }}
                />
            )}

            {isEditModalOpen && selectedRoom && (
                <EditRoomModal 
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        fetchRooms();
                        showSuccess('Room details updated!');
                    }}
                    room={selectedRoom}
                />
            )}

            {isWIPModalOpen && selectedRoom && (
                <ViewRoomModal 
                    isOpen={isWIPModalOpen}
                    onClose={() => setIsWIPModalOpen(false)}
                    room={selectedRoom}
                />
            )}
        </div>
    );
};

export default FacilitiesTab;

