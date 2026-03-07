import React, { useState, useEffect } from 'react';
import { 
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { facilitiesApi } from '../../api/facilities';
import RoomModal from './components/RoomModal';

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await facilitiesApi.getRooms({ search: searchQuery });
      setRooms(res.data.results || res.data);
    } catch (err) {
      showToast('error', 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [searchQuery]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      await facilitiesApi.deleteRoom(id);
      showToast('success', 'Room deleted');
      fetchRooms();
    } catch (err) {
      showToast('error', 'Failed to delete room');
    }
  };

  const columns = [
    { header: 'Room Name', accessor: 'name' },
    { header: 'Type', accessor: 'room_type_display' },
    { 
      header: 'Capacity', 
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-slate-400" />
          <span>{row.capacity} students</span>
        </div>
      ) 
    },
    { 
      header: 'Status',
      render: (row) => row.is_active ? 
        <Badge variant="success">Active</Badge> : 
        <Badge variant="error">Inactive</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<Edit2 size={16} />} 
            onClick={() => { setEditingRoom(row); setModalOpen(true); }} 
          />
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<Trash2 size={16} className="text-red-500" />} 
            onClick={() => handleDelete(row.id)} 
          />
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Room Management</h1>
          <p className="text-slate-500">Manage campus facilities and capacities</p>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => { setEditingRoom(null); setModalOpen(true); }}>
          Add Room
        </Button>
      </div>

      <div className="max-w-md">
        <Input 
          placeholder="Search room name..." 
          icon={<Search size={18} />} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card padding="0">
        <Table columns={columns} data={rooms} loading={loading} />
      </Card>

      <RoomModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={fetchRooms} 
        room={editingRoom} 
      />
    </div>
  );
};

export default RoomManagement;
