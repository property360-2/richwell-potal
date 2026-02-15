import React from 'react';
import { 
    BookOpen, 
    ChevronRight, 
    ArrowRightCircle, 
    ShieldAlert,
    AlertCircle,
    Trash2,
    Plus
} from 'lucide-react';

const CurriculumStructureView = ({ structure, program, onAssign, onRemove }) => {
    // years: 1 to duration_years
    const yearLevels = Array.from({ length: program.duration_years }, (_, i) => i + 1);
    const semesters = [
        { id: 1, name: '1st Semester' },
        { id: 2, name: '2nd Semester' },
        { id: 3, name: 'Summer' }
    ];

    return (
        <div className="space-y-12">
            {yearLevels.map(year => (
                <div key={year} className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-100">
                            {year}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Year Level {year}</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Academic Year Group</p>
                        </div>
                        <div className="flex-grow border-t border-gray-100 ml-4"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {semesters.map(sem => {
                            const subjects = structure[year]?.[sem.id] || [];
                            const totalUnits = subjects.reduce((sum, s) => sum + s.units, 0);

                            return (
                                <div key={sem.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">{sem.name}</h4>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{subjects.length} Subjects • {totalUnits} Units</p>
                                        </div>
                                        <button 
                                            onClick={() => onAssign(year, sem.id)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                            title="Assign Subject"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    <div className="p-4 space-y-3 flex-grow">
                                        {subjects.length > 0 ? (
                                            subjects.map(subject => (
                                                <div key={subject.id} className="p-4 bg-gray-50/30 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all group/item shadow-sm hover:shadow-md">
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                                                {subject.code}
                                                            </span>
                                                            {subject.is_major && (
                                                                <ShieldAlert size={12} className="text-purple-500" />
                                                            )}
                                                        </div>
                                                        <button 
                                                            onClick={() => onRemove(subject.id)}
                                                            className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-item-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <h5 className="text-xs font-bold text-gray-800 line-clamp-1 mb-1">{subject.title}</h5>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                            {subject.units} Units
                                                        </span>
                                                        {subject.prerequisites?.length > 0 && (
                                                            <div className="flex items-center gap-1 text-[9px] font-bold text-amber-500 uppercase tracking-widest">
                                                                <AlertCircle size={10} />
                                                                {subject.prerequisites.length} Prereq
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-12 text-center">
                                                <div className="w-10 h-10 bg-gray-50 text-gray-300 rounded-xl flex items-center justify-center mx-auto mb-3">
                                                    <BookOpen size={20} />
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No Subjects Linked</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {totalUnits > 24 && (
                                        <div className="px-6 py-2 bg-amber-50 text-amber-600 flex items-center gap-2">
                                            <AlertCircle size={12} />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Unit Overload Warning</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CurriculumStructureView;
