import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

const SearchInput = ({ 
    placeholder = 'SEARCH DATABASE...', 
    onSearch, 
    debounceMs = 500,
    className = ''
}) => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!query && !isSearching) return;
        
        setIsSearching(true);
        const timer = setTimeout(() => {
            onSearch(query);
            setIsSearching(false);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [query, onSearch, debounceMs]);

    const handleClear = () => {
        setQuery('');
        onSearch('');
    };

    return (
        <div className={`relative group ${className}`}>
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                {isSearching ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                    <Search className={`w-5 h-5 transition-colors ${query ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-400'}`} />
                )}
            </div>
            
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-gray-50 border border-transparent border-gray-200 pl-14 pr-12 py-4 rounded-[24px] text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-black placeholder:text-[10px] placeholder:tracking-[0.2em] focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-inner"
                placeholder={placeholder.toUpperCase()}
            />

            {query && (
                <button 
                    onClick={handleClear}
                    className="absolute inset-y-0 right-5 flex items-center text-gray-400 hover:text-rose-500 transition-colors"
                >
                    <X size={18} />
                </button>
            )}
        </div>
    );
};

export default SearchInput;
