/**
 * CapacityStatusWidget.jsx
 * 
 * A high-priority dashboard widget for the Registrar/Dean to monitor 
 * capacity bottlenecks where students are approved but lack section slots.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ChevronRight, UserPlus } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { schedulingApi } from '../../../api/scheduling';

/**
 * CapacityStatusWidget Component
 * 
 * @param {Object} props
 * @param {string} props.termId - The active term ID
 * @param {Function} props.onResolveNeeded - Callback when a re-sync is recommended
 */
const CapacityStatusWidget = ({ termId, onResolveNeeded }) => {
    const [bottlenecks, setBottlenecks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [error, setError] = useState(null);

    const fetchBottlenecks = useCallback(async () => {
        if (!termId || termId === 'undefined') return;
        try {
            setLoading(true);
            setError(null);
            const response = await schedulingApi.getCapacityBottlenecks(termId);
            setBottlenecks(response.data || []);
            setLastUpdated(new Date());
        } catch (err) {
            setError('Failed to load capacity bottlenecks');
        } finally {
            setLoading(false);
        }
    }, [termId]);

    useEffect(() => {
        fetchBottlenecks();
        
        // Polling every 2 minutes for real-time demand monitoring
        const interval = setInterval(fetchBottlenecks, 120000);
        return () => clearInterval(interval);
    }, [termId]);

    if (loading && bottlenecks.length === 0) {
        return (
            <Card className="p-6 flex items-center justify-center min-h-[160px]">
                <LoadingSpinner size="md" />
            </Card>
        );
    }

    const totalDeficitStudents = bottlenecks.reduce((sum, b) => sum + b.students_waiting, 0);
    const totalNewBlocksNeeded = bottlenecks.reduce((sum, b) => sum + b.sections_needed, 0);

    const hasBottlenecks = totalDeficitStudents > 0;

    return (
        <Card className={`overflow-hidden border-l-4 ${hasBottlenecks ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-emerald-500 bg-emerald-50/30'}`}>
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${hasBottlenecks ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {hasBottlenecks ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg leading-tight">
                                {hasBottlenecks ? 'Capacity Bottlenecks Detected' : 'Capacity Status Optimized'}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Last checked: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                    {hasBottlenecks && (
                        <Badge variant="warning" className="animate-pulse py-1 px-3">
                            ACTION REQUIRED
                        </Badge>
                    )}
                </div>

                {hasBottlenecks ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-2xl border border-amber-100 shadow-sm">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Waiting Students</div>
                                <div className="text-2xl font-black text-amber-600 flex items-center gap-2">
                                    <UserPlus size={20} />
                                    {totalDeficitStudents}
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-amber-100 shadow-sm">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status / Action</div>
                                <div className="text-xl font-black text-slate-700 flex items-center gap-2">
                                    <RefreshCw size={20} className={totalNewBlocksNeeded > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                                    {totalNewBlocksNeeded > 0 ? (
                                        <span className="text-amber-600">{totalNewBlocksNeeded} Blocks Needed</span>
                                    ) : (
                                        <span className="text-emerald-600 text-sm">Assignment Ready</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                            {bottlenecks.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between py-2 border-b border-amber-100/50 last:border-0">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 uppercase">{item.program_code}</span>
                                        <span className="text-[10px] text-slate-500">Level {item.year_level}</span>
                                    </div>
                                    <div className="text-xs font-bold text-amber-600">
                                        +{item.students_waiting} students
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 flex gap-2">
                            <p className="text-[10px] text-slate-500 font-medium italic">
                                Use the 'Distribute Unassigned' button in the dashboard header to assign waiting students to available sections.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 flex flex-col items-center justify-center text-center">
                        <div className="text-emerald-600 font-bold mb-1">No pending students found!</div>
                        <p className="text-xs text-slate-500 max-w-[280px]">
                            All approved students have been successfully assigned to sections for this term.
                        </p>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-4 text-slate-400"
                            icon={<RefreshCw size={14} />}
                            onClick={fetchBottlenecks}
                        >
                            Refreshing...
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default CapacityStatusWidget;
