import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { api, endpoints } from '../../../../api';
import Button from '../../../../components/ui/Button';

const OverrideEnrollModal = ({ enrollmentId, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [sections, setSections] = useState([]);
    const [loadingSections, setLoadingSections] = useState(false);
    
    const [selectedSection, setSelectedSection] = useState(null);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (searchTerm.length > 2) {
            const delay = setTimeout(fetchSections, 500);
            return () => clearTimeout(delay);
        }
    }, [searchTerm]);

    const fetchSections = async () => {
        try {
            setLoadingSections(true);
            const res = await api.get(endpoints.sections, { 
                params: { search: searchTerm, page_size: 10 } 
            });
            setSections(res.results || res || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingSections(false);
        }
    };

    const handleSubmit = async () => {
        if (!reason.trim()) {
            setError('Please provide a valid reason for override.');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            
            // Construct the URL manually since endpoints might not have this specific dynamic one
            // endpoints.overrideEnroll might not exist yet in proper api.jsx map if I didn't add it or checks failed
            // Actually, I did NOT add it to api.jsx in Phase C planning (I checked backend contract but didn't list api.jsx update in task C2 plan explicitly, but usually required).
            // Let's assume I need to use the path directly or add it.
            // Path: /admissions/enrollment/<id>/override-enroll/
            
            await api.post(`/admissions/enrollment/${enrollmentId}/override-enroll/`, {
                section_id: selectedSection.id,
                override_reason: reason
            });

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Override failed. Check capacity or conflicts.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Override Enrollment</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Force-add subject to student load</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-8">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search Subject Code or Section Name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm focus:outline-none focus:border-blue-500 transition-all"
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                                {loadingSections ? (
                                    <div className="py-8 text-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" /></div>
                                ) : sections.length > 0 ? (
                                    sections.map(section => (
                                        <button
                                            key={section.id}
                                            onClick={() => { setSelectedSection(section); setStep(2); }}
                                            className="w-full text-left p-4 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all group"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-black text-gray-900 text-sm group-hover:text-blue-700">{section.subject_code} - {section.name}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{section.schedule_summary || 'No Schedule'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                                        section.enrolled_count >= section.capacity 
                                                            ? 'bg-red-100 text-red-600' 
                                                            : 'bg-green-100 text-green-600'
                                                    }`}>
                                                        {section.enrolled_count}/{section.capacity}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-400 text-xs py-4 font-bold uppercase tracking-widest">
                                        {searchTerm.length > 2 ? 'No sections found' : 'Type to search...'}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected Section</p>
                                    <button onClick={() => setStep(1)} className="text-[10px] font-bold text-blue-600 hover:underline">CHANGE</button>
                                </div>
                                <p className="font-black text-lg text-gray-900">{selectedSection.subject_code}</p>
                                <p className="text-sm text-gray-600 font-medium">{selectedSection.name}</p>
                                {selectedSection.enrolled_count >= selectedSection.capacity && (
                                    <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg text-xs font-bold">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>Capacity Full - Override Required</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Override Reason</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="e.g., Graduating student needing units, Dean's approval..."
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-medium text-sm focus:outline-none focus:border-blue-500 transition-all h-32 resize-none"
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <Button 
                                variant="primary" 
                                className="w-full py-4" 
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'CONFIRM OVERRIDE'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OverrideEnrollModal;
