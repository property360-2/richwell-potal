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
 * @returns {JSX.Element} Renders the bulk import tab content.
 */
const ImportTab = () => {
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
    <div className="tab-content flex flex-col items-center">
      <Card className="import-card w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
            <Upload size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Bulk Subject Import</h2>
          <p className="text-slate-500 mt-2">
            Upload a CSV file containing curriculum subjects. The system will automatically link them to their respective programs.
          </p>
        </div>

        {!uploadResult ? (
          <div 
            className={`upload-zone mb-6 p-10 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:border-indigo-400 hover:bg-slate-50 ${file ? 'border-indigo-500 bg-indigo-50' : ''}`}
            onClick={() => document.getElementById('csv-file').click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500'); }}
            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500'); }}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile?.name.endsWith('.csv')) setFile(droppedFile);
            }}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <FileText size={48} className="text-indigo-500 mb-2" />
                <span className="font-medium text-indigo-600">{file.name}</span>
                <span className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(2)} KB</span>
              </div>
            ) : (
              <>
                <Upload size={48} className="text-slate-300 mb-2" />
                <p className="font-medium text-slate-700">Click or drag CSV here</p>
                <p className="text-sm text-slate-400">Download CSV template</p>
              </>
            )}
            <input 
              type="file" 
              id="csv-file" 
              hidden 
              accept=".csv" 
              onChange={handleFileChange} 
            />
          </div>
        ) : (
          <div className="result-area mb-6 p-6 bg-slate-50 rounded-lg border border-slate-200">
             <div className="flex items-center gap-3 mb-4 text-green-600">
                <CheckCircle size={24} />
                <h4 className="font-bold">Import Summary</h4>
             </div>
             <div className="grid grid-cols-3 gap-4">
               <div className="bg-white p-3 rounded border border-slate-200 text-center">
                  <div className="text-sm text-slate-500">Programs</div>
                  <div className="text-xl font-bold text-slate-800">{uploadResult.stats?.programs_created || 0}</div>
               </div>
               <div className="bg-white p-3 rounded border border-slate-200 text-center">
                  <div className="text-sm text-slate-500">Curriculums</div>
                  <div className="text-xl font-bold text-slate-800">{uploadResult.stats?.curriculums_created || 0}</div>
               </div>
               <div className="bg-white p-3 rounded border border-slate-200 text-center">
                  <div className="text-sm text-slate-500">Subjects</div>
                  <div className="text-xl font-bold text-slate-800">{uploadResult.stats?.subjects_processed || 0}</div>
               </div>
             </div>
             {uploadResult.errors?.length > 0 && (
               <div className="mt-4">
                 <div className="flex items-center gap-2 text-amber-600 text-sm font-bold mb-2">
                   <AlertCircle size={16} />
                   <span>Warnings/Errors ({uploadResult.errors.length})</span>
                 </div>
                 <div className="max-h-32 overflow-y-auto text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                    {uploadResult.errors.map((err, i) => <div key={i} className="mb-1">• {err}</div>)}
                 </div>
               </div>
             )}
             <Button variant="ghost" className="w-full mt-4" onClick={() => setUploadResult(null)}>
                Upload Another File
             </Button>
          </div>
        )}

        {file && (
          <Button 
            variant="primary" 
            className="w-full" 
            onClick={handleUpload} 
            loading={uploading}
            icon={<Upload size={18} />}
          >
            Start Import
          </Button>
        )}
      </Card>
      
      <div className="mt-8 text-slate-400 text-sm max-w-xl text-center leading-relaxed">
        <strong>Important:</strong> The CSV must follow the system format with columns: 
        Program, Year_Semester, Program_Code, Subject_Description, Lec_Units, Lab_Units, Total_Units.
      </div>
    </div>
  );
};

export default ImportTab;
