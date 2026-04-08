import React, { useState, useEffect } from 'react';
import Modal from '../../../../components/ui/Modal';
import { schedulingApi } from '../../../../api/scheduling';
import { termsApi } from '../../../../api/terms';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';
import { Calendar, MapPin, Clock } from 'lucide-react';

const RoomUtilizationModal = ({ isOpen, onClose, room }) => {
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState(null);
    const [activeTerm, setActiveTerm] = useState(null);

    const fetchData = async () => {
        if (!room || !isOpen) return;
        try {
            setLoading(true);
            const termRes = await termsApi.getTerms({ is_active: true });
            const term = termRes.data.results?.[0] || termRes.data[0];
            setActiveTerm(term);

            if (term) {
                const res = await schedulingApi.getRoomInsights(room.id, term.id);
                setInsights(res.data);
            }
        } catch (err) {
            console.error('Failed to load room utilization:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [isOpen, room]);

    const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Utilization: ${room?.name}`}
            size="lg"
        >
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 uppercase text-xs tracking-tight">{room?.name}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{room?.room_type_display} • Capacity: {room?.capacity}</p>
                        </div>
                    </div>
                    {activeTerm && (
                        <div className="text-right">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Term</div>
                            <div className="text-sm font-black text-primary">{activeTerm.code}</div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center"><LoadingSpinner size="lg" /></div>
                ) : insights ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {DAYS_ORDER.map(day => {
                            const entries = insights[day] || [];
                            return (
                                <div key={day} className={`p-4 rounded-xl border ${entries.length > 0 ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-50 pb-2">
                                        <Calendar size={14} className="text-primary" />
                                        <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-700">{day}</h5>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {entries.length === 0 ? (
                                            <p className="text-[10px] text-slate-400 italic font-bold">No classes scheduled</p>
                                        ) : (
                                            entries.map((entry, idx) => (
                                                <div key={idx} className="p-2 rounded bg-slate-50 border-l-2 border-primary">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-[10px] font-black text-primary">{entry.time}</span>
                                                        <span className="text-[8px] font-black bg-white px-1 rounded border border-slate-100 text-slate-400">{entry.section}</span>
                                                    </div>
                                                    <div className="text-[11px] font-bold text-slate-700 line-clamp-1">{entry.subject}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-400 italic">No usage data found for this term.</div>
                )}
            </div>
        </Modal>
    );
};

export default RoomUtilizationModal;
