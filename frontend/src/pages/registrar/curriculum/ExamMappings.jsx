import React, { useState, useEffect } from 'react';
import { 
    Calendar, 
    Plus, 
    Edit2, 
    Trash2, 
    CheckCircle, 
    XCircle,
    Loader2,
    Save,
    X,
    Filter
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { api, endpoints } from '../../../api';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import SEO from '../../../components/shared/SEO';

const ExamMappings = () => {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    const [mappings, setMappings] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [selectedSemester, setSelectedSemester] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        semester: '',
        exam_period: 'PRELIM',
        required_month: 1,
        is_active: true
    });

    const periods = [
        { value: 'PRELIM', label: 'Preliminary Exam' },
        { value: 'MIDTERM', label: 'Midterm Exam' },
        { value: 'PREFINAL', label: 'Pre-Final Exam' },
        { value: 'FINAL', label: 'Final Exam' }
    ];

    useEffect(() => {
        fetchSemesters();
    }, []);

    useEffect(() => {
        if (selectedSemester) {
            fetchMappings();
        }
    }, [selectedSemester]);

    const fetchSemesters = async () => {
        try {
            const res = await api.get(endpoints.semesters);
            const sems = res.results || res;
            setSemesters(sems);
            
            // Default to active semester or first in list
            const active = sems.find(s => s.is_current);
            if (active) setSelectedSemester(active.id);
            else if (sems.length > 0) setSelectedSemester(sems[0].id);
        } catch (err) {
            console.error(err);
            error('Failed to load semesters');
        }
    };

    const fetchMappings = async () => {
        try {
            setLoading(true);
            const res = await api.get(endpoints.examMappings, { semester: selectedSemester });
            setMappings(res.results || res);
        } catch (err) {
            console.error(err);
            error('Failed to load mappings');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = { ...formData, semester: selectedSemester };
            
            if (editingId) {
                await api.put(endpoints.examMappingDetail(editingId), payload);
                success('Mapping updated successfully');
            } else {
                await api.post(endpoints.examMappings, payload);
                success('Mapping created successfully');
            }
            
            setIsModalOpen(false);
            fetchMappings();
        } catch (err) {
            console.error(err);
            error(err.message || 'Failed to save mapping');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this mapping?')) return;
        try {
            await api.delete(endpoints.examMappingDetail(id));
            success('Mapping deleted');
            fetchMappings();
        } catch (err) {
            error('Failed to delete mapping');
        }
    };

    const openModal = (mapping = null) => {
        if (mapping) {
            setEditingId(mapping.id);
            setFormData({
                semester: mapping.semester,
                exam_period: mapping.exam_period,
                required_month: mapping.required_month,
                is_active: mapping.is_active
            });
        } else {
            setEditingId(null);
            setFormData({
                semester: selectedSemester,
                exam_period: 'PRELIM',
                required_month: 1,
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SEO title="Exam Configurations" description="Configure exam periods and payment requirements." />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Exam Configurations</h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        Map exam periods to required payment months
                    </p>
                </div>
                <div className="flex gap-2">
                     <Button variant="primary" icon={Plus} onClick={() => openModal()}>Add Mapping</Button>
                </div>
            </div>

            {/* Semester Filter */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 mb-6 max-w-md">
                <Filter className="w-5 h-5 text-gray-400" />
                <select 
                    className="w-full bg-transparent font-bold text-gray-700 outline-none"
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                >
                    {semesters.map(s => (
                        <option key={s.id} value={s.id}>
                            {s.school_year} - {s.name} {s.is_current ? '(Active)' : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
                ) : mappings.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No mappings found for this semester.</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Exam Period</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Required Payment</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {mappings.map((m) => (
                                <tr key={m.id} className="group hover:bg-blue-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900">{m.exam_period}</td>
                                    <td className="px-6 py-4 font-medium text-gray-600">Month {m.required_month}</td>
                                    <td className="px-6 py-4">
                                        {m.is_active ? 
                                            <Badge variant="green" size="sm" icon={CheckCircle}>Active</Badge> : 
                                            <Badge variant="gray" size="sm" icon={XCircle}>Inactive</Badge>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openModal(m)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(m.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Mapping" : "New Mapping"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Exam Period</label>
                        <select 
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={formData.exam_period}
                            onChange={(e) => setFormData({...formData, exam_period: e.target.value})}
                            required
                        >
                            {periods.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Required Month (1-6)</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="6"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={formData.required_month}
                            onChange={(e) => setFormData({...formData, required_month: parseInt(e.target.value)})}
                            required
                        />
                         <p className="text-xs text-gray-400 mt-1">Month number in the payment schedule (e.g., 1st Month, 2nd Month).</p>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                        <input 
                            type="checkbox" 
                            id="isActive"
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        />
                        <label htmlFor="isActive" className="text-sm font-bold text-gray-700 select-none cursor-pointer">Active</label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
                        <Button type="submit" variant="primary" loading={submitting} className="flex-1">Save Configuration</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ExamMappings;
