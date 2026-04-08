/**
 * @file ImportTab.jsx
 * @description Provides interface for bulk importing subjects from CSV files.
 * It manages file uploads, display of import results, and validation feedback.
 */

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import { academicsApi } from '../../../../api/academics';
import { useToast } from '../../../../components/ui/Toast';

/**
 * ImportTab Component
 * 
 * @param {Object} props - Component properties.
 * @param {Object} props.styles - The styles object from AcademicManagement.module.css.
 * @returns {JSX.Element} Renders the bulk import tab content.
 */
const ImportTab = ({ styles }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const { showToast } = useToast();

  /**
   * Validates and sets the selected file for upload.
   * @param {Event} e - The input change event.
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setUploadResult(null);
    } else {
      showToast('error', 'Please select a valid CSV file');
    }
  };

  /**
   * Uploads the selected CSV file to the API for processing.
   */
  const handleUpload = async () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await academicsApi.bulkUploadSubjects(formData);
      setUploadResult(res.data);
      showToast('success', 'Import completed successfully');
      setFile(null);
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Card className={`${styles.importCard} w-full max-w-2xl overflow-hidden`}>
        <div className="text-center mb-10 mt-4">
          <div className="inline-flex items-center justify-center p-5 bg-indigo-50 text-indigo-600 rounded-2xl mb-6 shadow-sm">
            <Upload size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Bulk Subject Import</h2>
          <p className="text-slate-500 mt-3 max-w-md mx-auto leading-relaxed">
            Upload a CSV file containing curriculum subjects. The system will automatically link them to their respective programs.
          </p>
        </div>

        {!uploadResult ? (
          <div 
            className={`${styles.uploadZone} mb-8 ${file ? styles.activeFile : ''}`}
            onClick={() => document.getElementById('csv-file').click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.background = "#f1f5f9"; }}
            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = ""; e.currentTarget.style.background = ""; }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.background = "";
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile?.name.endsWith('.csv')) setFile(droppedFile);
            }}
          >
            <div className="relative z-10 flex flex-col items-center text-center">
              {file ? (
                <>
                  <div className="p-4 bg-indigo-100 text-indigo-600 rounded-xl mb-4">
                    <FileText size={48} />
                  </div>
                  <span className="text-lg font-bold text-indigo-700 mb-1">{file.name}</span>
                  <span className="text-sm text-slate-500 font-medium tracking-wide">
                    {(file.size / 1024).toFixed(2)} KB • Ready to import
                  </span>
                </>
              ) : (
                <>
                  <Upload size={56} className="text-slate-300 mb-6" />
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Click or drag CSV here</h3>
                  <p className="text-sm text-slate-500 max-w-[200px]">
                    Ensure your file follows the required curriculum format.
                  </p>
                  <button className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest border-b border-indigo-200 pb-1">
                    Download CSV Template
                  </button>
                </>
              )}
            </div>
            <input 
              type="file" 
              id="csv-file" 
              hidden 
              accept=".csv" 
              onChange={handleFileChange} 
            />
          </div>
        ) : (
          <div className={`${styles.resultArea} mb-8 p-8 bg-slate-50 rounded-2xl border border-slate-200`}>
             <div className="flex items-center gap-4 mb-6 text-green-600">
                <CheckCircle size={28} className="drop-shadow-sm" />
                <h4 className="text-lg font-bold tracking-tight">Import Successful</h4>
             </div>
             <div className="grid grid-cols-3 gap-5">
               <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Programs</div>
                  <div className="text-2xl font-black text-slate-800">{uploadResult.stats?.programs_created || 0}</div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Curriculums</div>
                  <div className="text-2xl font-black text-slate-800">{uploadResult.stats?.curriculums_created || 0}</div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subjects</div>
                  <div className="text-2xl font-black text-slate-800">{uploadResult.stats?.subjects_processed || 0}</div>
               </div>
             </div>
             {uploadResult.errors?.length > 0 && (
               <div className="mt-8">
                 <div className="flex items-center gap-2 text-amber-600 text-xs font-bold mb-3 uppercase tracking-wider">
                   <AlertCircle size={14} />
                   <span>Optimization Suggestions ({uploadResult.errors.length})</span>
                 </div>
                 <div className="max-h-40 overflow-y-auto text-xs text-slate-600 bg-white p-4 rounded-xl border border-slate-100 leading-relaxed">
                    {uploadResult.errors.map((err, i) => (
                      <div key={i} className="mb-2 last:mb-0 pb-2 border-b border-slate-50 last:border-0 flex gap-2">
                        <span className="text-amber-400">•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                 </div>
               </div>
             )}
             <Button variant="ghost" className="w-full mt-6 py-3 font-semibold" onClick={() => setUploadResult(null)}>
                Import Another Dataset
             </Button>
          </div>
        )}

        {file && !uploadResult && (
          <Button 
            variant="primary" 
            className="w-full py-4 text-md font-bold shadow-indigo-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all" 
            onClick={handleUpload} 
            loading={uploading}
            icon={<Upload size={20} />}
          >
            Initialize Import
          </Button>
        )}
      </Card>
      
      <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-sm max-w-2xl text-center leading-relaxed">
        <strong className="text-slate-700 block mb-1 uppercase text-xs tracking-widest font-bold">Data Integrity Notice</strong>
        The system precisely maps subjects to their programs based on the <code className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">Program_Code</code>. 
        Ensure your CSV header structure matches the template to prevent processing interruptions.
      </div>
    </div>
  );
};

export default ImportTab;
