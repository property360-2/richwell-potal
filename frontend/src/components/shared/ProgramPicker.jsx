import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Building, Check } from 'lucide-react';

const ProgramPicker = ({ 
    allPrograms = [], 
    selectedIds = [], 
    onChange, 
    label = "ASSIGNED PROGRAMS",
    placeholder = "Search programs..." 
}) => {
    const [search, setSearch] = useState('');

    const filteredPrograms = useMemo(() => {
        const query = search.toLowerCase();
        return allPrograms.filter(p => 
            !selectedIds.includes(p.id) && 
            (p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query))
        );
    }, [allPrograms, selectedIds, search]);

    const selectedPrograms = useMemo(() => {
        return allPrograms.filter(p => selectedIds.includes(p.id));
    }, [allPrograms, selectedIds]);

    const handleSelect = (id) => {
        onChange([...selectedIds, id]);
        setSearch(''); // Clear search on select
    };

    const handleRemove = (id) => {
        onChange(selectedIds.filter(sid => sid !== id));
    };

    return (
        <div className="space-y-4">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <Building className="w-3 h-3 inline mr-2 -translate-y-[1px]" />
                {label}
            </label>

            {/* Selected Chips */}
            <div className="flex flex-wrap gap-2 min-h-[44px] p-2 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                {selectedPrograms.length === 0 ? (
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center px-2">
                        No programs assigned yet
                    </p>
                ) : (
                    selectedPrograms.map(p => (
                        <div 
                            key={p.id}
                            className="flex items-center gap-2 bg-white border border-blue-100 px-3 py-1.5 rounded-xl shadow-sm animate-in zoom-in-95 duration-200"
                        >
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{p.code}</span>
                            <span className="text-[10px] text-gray-500 font-bold truncate max-w-[150px]">{p.name}</span>
                            <button 
                                type="button"
                                onClick={() => handleRemove(p.id)}
                                className="w-4 h-4 rounded-full bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors flex items-center justify-center"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Search and Picker List */}
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Search className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input 
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900 text-sm"
                />

                {search && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl py-2 z-50 max-h-[250px] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                        {filteredPrograms.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <Building className="w-8 h-8 text-gray-100 mx-auto mb-2" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching programs</p>
                            </div>
                        ) : (
                            <div className="px-2 space-y-1">
                                {filteredPrograms.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleSelect(p.id)}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 transition-colors group/item"
                                    >
                                        <div className="flex flex-col items-start px-2">
                                            <span className="text-xs font-black text-gray-900 tracking-tight">{p.code}</span>
                                            <span className="text-[10px] text-gray-500 font-bold tracking-tight">{p.name}</span>
                                        </div>
                                        <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {!search && filteredPrograms.length > 0 && selectedIds.length < 5 && (
                <div className="flex flex-wrap gap-2 pt-1">
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest w-full mb-1">Suggestions</p>
                    {filteredPrograms.slice(0, 3).map(p => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelect(p.id)}
                            className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg hover:border-blue-200 hover:text-blue-600 transition-all flex items-center gap-1"
                        >
                            <Plus className="w-2.5 h-2.5" />
                            {p.code}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProgramPicker;
