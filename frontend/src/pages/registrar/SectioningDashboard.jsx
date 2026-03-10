import React, { useState, useEffect } from 'react';
import { Users, LayoutGrid, FilePlus, ChevronRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';
import { sectionsApi } from '../../api/sections';
import { termsApi } from '../../api/terms';
import academicsApi from '../../api/academics';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';

const SectioningDashboard = () => {
  const [activeTerm, setActiveTerm] = useState(null);
  const [stats, setStats] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedSection, setSelectedSection] = useState(null);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [studentToTransfer, setStudentToTransfer] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const termsRes = await termsApi.getTerms({ is_active: true });
      const term = termsRes.data.results?.[0] || termsRes.data[0];
      setActiveTerm(term);

      if (term) {
        const statsRes = await sectionsApi.getStats(term.id);
        setStats(statsRes.data);

        const programsRes = await academicsApi.getPrograms();
        setPrograms(programsRes.data.results || programsRes.data);

        const sectionsRes = await sectionsApi.getSections({ term_id: term.id });
        setSections(sectionsRes.data.results || sectionsRes.data);
      }
    } catch (err) {
      showToast('error', 'Failed to load sectioning data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerate = async (programId, yearLevel) => {
    if (!window.confirm('This will auto-generate sections based on the number of approved students. Continue?')) return;
    try {
      await sectionsApi.generate({
        term_id: activeTerm.id,
        program_id: programId,
        year_level: yearLevel
      });
      showToast('success', 'Sections generated successfully');
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to generate sections');
    }
  };

  const handleViewRoster = async (section) => {
    setSelectedSection(section);
    setRoster([]); // Clear old roster
    setIsRosterOpen(true);
    try {
      setRosterLoading(true);
      const res = await sectionsApi.getSectionRoster(section.id);
      setRoster(res.data);
    } catch (err) {
      showToast('error', 'Failed to load roster');
    } finally {
      setRosterLoading(false);
    }
  };

  const handleOpenTransfer = (student) => {
    setStudentToTransfer(student);
    setTargetSectionId('');
    setIsTransferOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (!targetSectionId) return showToast('error', 'Select a target section');
    
    try {
      setIsTransferring(true);
      await sectionsApi.transferStudent(selectedSection.id, {
        student_id: studentToTransfer.student_id,
        target_section_id: targetSectionId
      });
      showToast('success', 'Student transferred successfully');
      setIsTransferOpen(false);
      handleViewRoster(selectedSection); // Refresh roster
      fetchData(); // Refresh counts
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  if (loading && !activeTerm) return <div className="p-8 h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const matrix = {};
  programs.forEach(p => {
    matrix[p.id] = { 1: 0, 2: 0, 3: 0, 4: 0 };
  });
  stats.forEach(s => {
    if (matrix[s.student__program__id]) {
      matrix[s.student__program__id][s.year_level] = s.count;
    }
  });

  const rosterColumns = [
    { header: 'IDN', accessor: 'student_idn' },
    { header: 'Full Name', accessor: 'student_name' },
    { 
        header: 'Role', 
        render: (row) => row.is_home_section ? <Badge variant="info">Primary</Badge> : <Badge variant="neutral">Irregular</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Button variant="ghost" size="xs" className="text-blue-600 font-bold" onClick={() => handleOpenTransfer(row)}>
          Transfer
        </Button>
      )
    }
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Sectioning Dashboard</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <Badge variant="primary">{activeTerm?.code}</Badge> 
            <span>Enrollment Matrix & Automated Section Generation</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="bg-white border-slate-200" icon={<RefreshCw size={18} />} onClick={fetchData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Enrollment Matrix Card */}
      <Card title="Enrollment Matrix (Approved Students)" className="shadow-lg border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="py-4 px-6 text-xs font-bold uppercase text-slate-500 tracking-wider">Program / Course</th>
                <th className="py-4 px-6 text-xs font-bold uppercase text-slate-500 tracking-wider text-center">1st Year</th>
                <th className="py-4 px-6 text-xs font-bold uppercase text-slate-500 tracking-wider text-center">2nd Year</th>
                <th className="py-4 px-6 text-xs font-bold uppercase text-slate-500 tracking-wider text-center">3rd Year</th>
                <th className="py-4 px-6 text-xs font-bold uppercase text-slate-500 tracking-wider text-center">4th Year</th>
              </tr>
            </thead>
            <tbody>
              {programs.map(program => (
                <tr key={program.id} className="border-b border-slate-50 hover:bg-blue-50/20 transition-all duration-200 group">
                  <td className="py-5 px-6">
                    <div className="font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase">{program.code}</div>
                    <div className="text-xs text-slate-500 font-medium truncate max-w-xs">{program.name}</div>
                  </td>
                  {[1, 2, 3, 4].map(year => {
                    const count = matrix[program.id]?.[year] || 0;
                    const existingSections = sections.filter(s => s.program === program.id && s.year_level === year);
                    const isFull = existingSections.some(s => s.student_count >= s.max_students);
                    
                    return (
                      <td key={year} className="py-5 px-6 text-center border-l border-slate-50/50">
                        <div className="flex flex-col items-center gap-3">
                          <span className={`text-xl font-black ${count > 0 ? 'text-slate-800' : 'text-slate-200'}`}>
                            {count}
                          </span>
                          
                          {count > 0 && existingSections.length === 0 ? (
                            <Button 
                              variant="primary" 
                              size="xs" 
                              className="rounded-full px-4 h-7 text-[10px] font-bold shadow-sm"
                              icon={<FilePlus size={12} />}
                              onClick={() => handleGenerate(program.id, year)}
                            >
                              GENERATE
                            </Button>
                          ) : existingSections.length > 0 ? (
                            <Badge variant={isFull ? "error" : "success"} className="rounded-full px-3 py-1 font-bold">
                              {existingSections.length} {existingSections.length === 1 ? 'SECTION' : 'SECTIONS'}
                            </Badge>
                          ) : (
                            <div className="h-7"></div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sections Grid Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutGrid size={20} className="text-blue-500" />
            Generated Sections
          </h2>
          <div className="text-sm font-medium text-slate-500">
            Showing {sections.length} active sections
          </div>
        </div>

        {sections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sections.map(section => (
              <Card 
                key={section.id} 
                className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group border-slate-200/80"
                onClick={() => handleViewRoster(section)}
              >
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                        {section.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant={section.session === 'AM' ? 'info' : 'warning'} className="text-[10px] py-0 px-2 font-black">
                            {section.session}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{section.program_code}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-800 tabular-nums">
                        {section.student_count}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Capacity</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                        <span>Fulfillment</span>
                        <span>{Math.round((section.student_count / section.max_students) * 100)}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className={`h-full transition-all duration-700 ease-out ${
                                section.student_count >= section.max_students ? 'bg-rose-500' : 
                                section.student_count > section.target_students ? 'bg-amber-500' : 
                                'bg-blue-600'
                            }`}
                            style={{ width: `${(section.student_count / section.max_students) * 100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[9px] font-medium text-slate-400">
                        <span>Target: {section.target_students}</span>
                        <span>Max: {section.max_students}</span>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-between text-slate-600 font-bold hover:bg-blue-50 group-hover:text-blue-600" 
                        icon={<ChevronRight size={16} />}
                        onClick={() => handleViewRoster(section)}
                    >
                        View Roster
                    </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-16 bg-slate-50/50 border-dashed border-2 border-slate-200">
            <Users className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">No Sections Generated</h3>
            <p className="text-slate-400 text-sm mt-1">Select a program and year above to begin sectioning.</p>
          </Card>
        )}
      </div>

      <Modal 
        isOpen={isRosterOpen} 
        onClose={() => setIsRosterOpen(false)} 
        title={`${selectedSection?.name} Roster`}
        size="lg"
      >
        <Table columns={rosterColumns} data={roster} loading={rosterLoading} />
        <div className="mt-6 flex justify-end">
            <Button variant="ghost" onClick={() => setIsRosterOpen(false)}>Close</Button>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Student"
        size="sm"
      >
        <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student</div>
                <div className="font-bold text-slate-800 uppercase">{studentToTransfer?.student_name}</div>
                <div className="text-xs text-slate-500">{studentToTransfer?.student_idn}</div>
            </div>

            <Select 
                label="Select Target Section"
                placeholder="Choose a section..."
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                options={sections
                    .filter(s => s.id !== selectedSection?.id && s.program === selectedSection?.program && s.year_level === selectedSection?.year_level)
                    .map(s => ({
                        value: s.id,
                        label: `${s.name} (${s.student_count}/${s.max_students})`
                    }))
                }
            />

            <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 flex gap-3">
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-[10px] font-bold leading-relaxed uppercase">
                    Transferring a student will update their primary section and all associated subject schedules.
                </p>
            </div>

            <div className="flex gap-3 justify-end mt-8">
                <Button variant="ghost" onClick={() => setIsTransferOpen(false)}>Cancel</Button>
                <Button variant="primary" loading={isTransferring} onClick={handleConfirmTransfer}>Complete Transfer</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default SectioningDashboard;
