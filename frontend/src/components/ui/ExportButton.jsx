import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';

const ExportButton = ({ endpoint, filename, label = 'Export Records', className = '' }) => {
    const { success, error, info } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExport = async (format) => {
        setIsOpen(false);
        setIsExporting(true);
        info(`Initializing ${format.toUpperCase()} generation...`);

        try {
            const response = await api.request(`${endpoint}?format=${format}`, {
                method: 'GET',
            });

            if (!response.ok) throw new Error('Export generation failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename || 'export'}_${new Date().getTime()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            success(`${format.toUpperCase()} export successful`);
        } catch (err) {
            console.error('Export error:', err);
            error(`Failed to export ${format.toUpperCase()}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="relative inline-block" ref={containerRef}>
            <button 
                type="button"
                disabled={isExporting}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                {isExporting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Download size={18} />
                )}
                <span>{isExporting ? 'PROCESSING...' : label}</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-[32px] shadow-2xl border border-gray-50 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-4 bg-gray-50/50 border-b border-gray-50">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Select Export Format</p>
                    </div>
                    
                    <button 
                        onClick={() => handleExport('excel')}
                        className="w-full flex items-center gap-4 px-6 py-5 hover:bg-emerald-50 transition-all group border-b border-gray-50"
                    >
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-black text-gray-900 tracking-tight">EXCEL SPREADSHEET</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Analysis Ready (.xlsx)</p>
                        </div>
                    </button>
                    
                    <button 
                        onClick={() => handleExport('pdf')}
                        className="w-full flex items-center gap-4 px-6 py-5 hover:bg-rose-50 transition-all group"
                    >
                        <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileText size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-black text-gray-900 tracking-tight">PDF DOCUMENT</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Official Print (.pdf)</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExportButton;
