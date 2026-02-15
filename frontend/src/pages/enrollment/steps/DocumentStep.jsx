import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, ShieldAlert } from 'lucide-react';

const DocumentStep = ({ documents, setDocuments }) => {
    const onDrop = useCallback(acceptedFiles => {
        setDocuments(prev => [...prev, ...acceptedFiles]);
    }, [setDocuments]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png']
        },
        maxSize: 10 * 1024 * 1024 // 10MB
    });

    const removeFile = (index) => {
        setDocuments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Required Documents</h3>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Upload clear copies of your documents</p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-100 rounded-3xl p-6 flex items-start gap-4">
                <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
                    <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight mb-1">Upload Checklist:</h4>
                    <ul className="text-xs font-bold text-blue-700 space-y-1 grid grid-cols-2 gap-x-4">
                        <li>• Valid ID (Front/Back)</li>
                        <li>• PSA Birth Certificate</li>
                        <li>• Form 138 / TOR</li>
                        <li>• Good Moral Certificate</li>
                    </ul>
                </div>
            </div>

            <div 
                {...getRootProps()} 
                className={`group border-4 border-dashed rounded-[40px] p-12 text-center transition-all cursor-pointer bg-gray-50/50
                    ${isDragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-blue-200 hover:bg-white hover:shadow-2xl hover:shadow-blue-100'}`}
            >
                <input {...getInputProps()} />
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gray-200 group-hover:scale-110 transition-transform duration-500">
                    <Upload className={`w-10 h-10 ${isDragActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} />
                </div>
                <h4 className="text-lg font-black text-gray-900 mb-2">
                    {isDragActive ? 'Drop your files here' : 'Select or Drop Files'}
                </h4>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">PDF, JPG, PNG up to 10MB</p>
            </div>

            {documents.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Uploaded Files ({documents.length})</h4>
                    <div className="grid gap-3">
                        {documents.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <File className="w-5 h-5" />
                                    </div>
                                    <div className="max-w-[200px] sm:max-w-md truncate">
                                        <p className="text-sm font-black text-gray-900 truncate">{file.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentStep;
