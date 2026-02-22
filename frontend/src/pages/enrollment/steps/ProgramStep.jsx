import React from 'react';
import { Book, GraduationCap, ChevronRight } from 'lucide-react';

const ProgramStep = ({ data, programs, onChange }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    <Book className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Choice of Program <span className="text-red-500">*</span></h3>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Select the course you wish to enroll in</p>
                </div>
            </div>

            <div className="grid gap-4">
                {programs.map((program) => (
                    <button
                        key={program.id}
                        type="button"
                        onClick={() => onChange('program_id', program.id)}
                        className={`text-left p-6 rounded-3xl border-2 transition-all flex items-center justify-between group
                            ${data.program_id === program.id 
                                ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-50' 
                                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100'
                            }`}
                    >
                        <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-2xl transition-colors
                                ${data.program_id === program.id ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className={`text-lg font-black transition-colors ${data.program_id === program.id ? 'text-blue-600' : 'text-gray-900'}`}>
                                    {program.name}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                        {program.code}
                                    </span>
                                    {program.curriculum_name && (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                                            {program.curriculum_name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={`transition-transform duration-300 ${data.program_id === program.id ? 'translate-x-1 grayscale-0' : 'grayscale translate-x-0'}`}>
                            <ChevronRight className={`w-6 h-6 ${data.program_id === program.id ? 'text-blue-600' : 'text-gray-300'}`} />
                        </div>
                    </button>
                ))}

                {programs.length === 0 && (
                    <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                        <p className="text-gray-400 font-bold">No programs available at this time.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgramStep;
