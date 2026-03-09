import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Layers, 
  Upload, 
  Plus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  FileText,
  Trash2,
  Edit2
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { academicsApi } from '../../api/academics';
import ProgramModal from './components/ProgramModal';
import SubjectModal from './components/SubjectModal';
import './AcademicManagement.css';

const ProgramTab = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const { showToast } = useToast();

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const res = await academicsApi.getPrograms();
      setPrograms(res.data.results || res.data);
    } catch (err) {
      showToast('error', 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleEdit = (program) => {
    setEditingProgram(program);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProgram(null);
    setModalOpen(true);
  };

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Program Name', accessor: 'name' },
    { header: 'Program Head', accessor: 'program_head_name', emptyValue: 'Not Assigned' },
    { 
      header: 'Summer',
      render: (row) => row.has_summer ? <Badge variant="info">Yes</Badge> : <Badge variant="neutral">No</Badge>
    },
    { 
      header: 'Status',
      render: (row) => row.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="error">Inactive</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" icon={<Edit2 size={16} />} onClick={() => handleEdit(row)} />
        </div>
      )
    }
  ];

  return (
    <div className="tab-content">
      <div className="content-header">
        <div className="search-box">
          <Input placeholder="Search programs..." icon={<Search size={18} />} />
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={handleAdd}>
          Add Program
        </Button>
      </div>

      <Card padding="0">
        <Table columns={columns} data={programs} loading={loading} />
      </Card>

      <ProgramModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={fetchPrograms} 
        program={editingProgram} 
      />
    </div>
  );
};

const SubjectTab = () => {
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
  const [selectedYearLevel, setSelectedYearLevel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const { showToast } = useToast();

  const YEAR_OPTIONS = [
    { value: '', label: 'All Year Levels' },
    { value: '1', label: '1st Year' },
    { value: '2', label: '2nd Year' },
    { value: '3', label: '3rd Year' },
    { value: '4', label: '4th Year' },
  ];

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await academicsApi.getPrograms({ is_active: true });
        const programList = res.data.results || res.data;
        setPrograms(programList);
        if (programList.length > 0) {
          setSelectedProgramId(programList[0].id);
        }
      } catch (err) {
        showToast('error', 'Failed to load programs');
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      const fetchCurriculums = async () => {
        try {
          const res = await academicsApi.getCurriculums({ program: selectedProgramId });
          const currList = res.data.results || res.data;
          setCurriculums(currList);
          const active = currList.find(c => c.is_active) || currList[0];
          setSelectedCurriculumId(active?.id || '');
        } catch (err) {
          showToast('error', 'Failed to load curriculums');
        }
      };
      fetchCurriculums();
    }
  }, [selectedProgramId]);

  const fetchSubjects = async () => {
    if (!selectedCurriculumId) return;
    try {
      setLoading(true);
      const params = { 
        curriculum: selectedCurriculumId,
        search: searchQuery,
        page_size: 100
      };
      if (selectedYearLevel) {
        params.year_level = selectedYearLevel;
      }

      const res = await academicsApi.getSubjects(params);
      setSubjects(res.data.results || res.data);
    } catch (err) {
      showToast('error', 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [selectedCurriculumId, selectedYearLevel, searchQuery]);

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Subject Title', accessor: 'description' },
    { 
      header: 'Y/S', 
      render: (row) => `${row.year_level} - ${row.semester === 'S' ? 'Summer' : row.semester + (row.semester === '1' ? 'st' : 'nd')}` 
    },
    { header: 'Units', accessor: 'total_units' },
    { 
        header: 'Major', 
        render: (row) => row.is_major ? <Badge variant="warning">Major</Badge> : <Badge variant="neutral">Minor</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" icon={<Edit2 size={16} />} onClick={() => { setEditingSubject(row); setModalOpen(true); }} />
          <Button variant="ghost" size="sm" icon={<Trash2 size={16} className="text-red-500" />} onClick={() => handleDelete(row.id)} />
        </div>
      )
    }
  ];

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await academicsApi.deleteSubject(id);
      showToast('success', 'Subject deleted');
      fetchSubjects();
    } catch (err) {
      showToast('error', 'Failed to delete subject');
    }
  };

  return (
    <div className="tab-content">
      <div className="content-filters bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
          <Select 
            label="Program" 
            value={selectedProgramId} 
            onChange={(e) => setSelectedProgramId(e.target.value)}
            options={programs.map(p => ({ value: p.id, label: p.code }))}
          />
          <Select 
            label="Curriculum" 
            value={selectedCurriculumId} 
            onChange={(e) => setSelectedCurriculumId(e.target.value)}
            options={curriculums.map(c => ({ value: c.id, label: c.version_name + (c.is_active ? ' (Active)' : '') }))}
            disabled={!selectedProgramId}
          />
          <Select 
            label="Year Level" 
            value={selectedYearLevel} 
            onChange={(e) => setSelectedYearLevel(e.target.value)}
            options={YEAR_OPTIONS}
            disabled={!selectedCurriculumId}
          />
          <div className="search-box-container">
             <Input 
                label="Search"
                placeholder="Search code/name..." 
                icon={<Search size={18} />} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <div className="flex justify-end">
             <Button variant="primary" icon={<Plus size={18} />} onClick={() => { setEditingSubject(null); setModalOpen(true); }} disabled={!selectedCurriculumId}>
                Add Subject
             </Button>
          </div>
        </div>
      </div>

      <Card padding="0">
        <Table 
          columns={columns} 
          data={subjects} 
          loading={loading} 
          emptyMessage={selectedCurriculumId ? "No subjects found for this selection." : "Please select a program and curriculum."}
        />
      </Card>

      {selectedCurriculumId && (
        <SubjectModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          onSuccess={fetchSubjects} 
          curriculumId={selectedCurriculumId}
          subject={editingSubject} 
        />
      )}
    </div>
  );
};

const ImportTab = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const { showToast } = useToast();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setUploadResult(null);
    } else {
      showToast('error', 'Please select a valid CSV file');
    }
  };

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
            className={`upload-zone mb-6 ${file ? 'border-primary bg-primary-light' : ''}`}
            onClick={() => document.getElementById('csv-file').click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary'); }}
            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary'); }}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile?.name.endsWith('.csv')) setFile(droppedFile);
            }}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <FileText size={48} className="text-primary mb-2" />
                <span className="font-medium text-primary">{file.name}</span>
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

const AcademicManagement = () => {
  const [activeTab, setActiveTab] = useState('programs');

  const tabs = [
    { id: 'programs', label: 'Programs', icon: BookOpen },
    { id: 'subjects', label: 'Subjects', icon: Layers },
    { id: 'import', label: 'Bulk Import', icon: Upload },
  ];

  return (
    <div className="academic-management">
      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="active-tab-container">
        {activeTab === 'programs' && <ProgramTab />}
        {activeTab === 'subjects' && <SubjectTab />}
        {activeTab === 'import' && <ImportTab />}
      </div>
    </div>
  );
};

export default AcademicManagement;
