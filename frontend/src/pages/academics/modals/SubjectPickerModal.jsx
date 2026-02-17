import React, { useState, useMemo } from 'react';
import { X, Search, BookOpen, Monitor, CheckCircle2 } from 'lucide-react';
import { createPortal } from 'react-dom';

const SubjectPickerModal = ({ isOpen, onClose, onSelect, subjects = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const filteredSubjects = useMemo(() => {
        return subjects.filter(subject => {
            return (
                subject.subject_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                subject.subject_title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        });
    }, [subjects, searchQuery]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight mb-1">Select Subject</h3>
                        <p className="text-xs font-bold text-gray-400">Choose a subject to schedule</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search subjects..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Subject List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {filteredSubjects.length > 0 ? (
                        filteredSubjects.map(subject => (
                            <div 
                                key={subject.id} 
                                onClick={() => onSelect(subject)}
                                className="group p-4 bg-white border border-gray-100 hover:border-indigo-500 hover:shadow-md rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                        subject.subject_type === 'LAB' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'
                                    }`}>
                                        {subject.subject_type === 'LAB' ? <Monitor size={20} /> : <BookOpen size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-900 text-sm mb-0.5">{subject.subject_code}</h4>
                                        <p className="text-xs text-gray-500 font-medium line-clamp-1 w-full max-w-[280px]">
                                            {subject.subject_title}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Units</div>
                                        <div className="text-sm font-black text-gray-900">{subject.units}</div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-indigo-100 text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50">
                                        <CheckCircle2 size={16} />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-gray-400 font-bold text-sm">No subjects found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SubjectPickerModal;
