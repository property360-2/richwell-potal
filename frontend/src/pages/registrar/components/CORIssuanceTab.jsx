/**
 * CORIssuanceTab Component
 * 
 * This component provides an interface for searching students and generating 
 * Certificate of Registration (COR) PDF reports for a selected academic term.
 * It is designed to be embedded as a tab within the Document Verification page.
 */

import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, User, Info } from 'lucide-react';
import { reportsApi } from '../../../api/reports';
import { studentsApi } from '../../../api/students';
import { termsApi } from '../../../api/terms';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const CORIssuanceTab = ({ initialStudent = null }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(initialStudent);
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchTerms();
  }, []);

  useEffect(() => {
    if (initialStudent) {
      setSelectedStudent(initialStudent);
    }
  }, [initialStudent]);

  const fetchTerms = async () => {
    try {
      const res = await termsApi.getTerms();
      const termsData = res.data.results || res.data;
      setTerms(termsData);
      const active = termsData.find(t => t.is_active);
      if (active) setSelectedTerm(active.id);
    } catch (e) {
      console.error('Failed to fetch terms:', e);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    try {
      const res = await studentsApi.getStudents({ search: searchQuery });
      setStudents(res.data.results || res.data);
    } catch (e) {
      console.error('Student search failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedStudent || !selectedTerm) return;
    setDownloading(true);
    try {
      const res = await reportsApi.getCOR({ 
        student_id: selectedStudent.id, 
        term_id: selectedTerm 
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `COR_${selectedStudent.idn}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Failed to generate COR. Ensure the student is enrolled in the selected term.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="cor-issuance-tab animate-in fade-in duration-500">
      <div className="reports-grid">
        <Card className="search-card">
          <form onSubmit={handleSearch} className="search-form">
            <div className="w-full">
              <Input 
                placeholder="Search Student Name or ID..." 
                icon={<Search size={18} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" loading={loading} className="whitespace-nowrap shrink-0">Search</Button>
          </form>

          <div className="student-results">
            {students.length > 0 ? (
              students.map(s => (
                <div 
                  key={s.id} 
                  className={`student-item ${selectedStudent?.id === s.id ? 'active' : ''}`}
                  onClick={() => setSelectedStudent(s)}
                >
                  <User size={16} />
                  <div className="info">
                    <span className="name">{s.user.last_name}, {s.user.first_name}</span>
                    <span className="idn">{s.idn}</span>
                  </div>
                </div>
              ))
            ) : searchQuery && !loading && (
              <div className="empty-results">No students found</div>
            )}
          </div>
        </Card>

        {selectedStudent && (
          <Card className="preview-card animate-in fade-in slide-in-from-right-4">
            <div className="preview-header">
               <div className="user-avatar-large">
                  <User size={32} />
               </div>
               <h3>{selectedStudent.user.last_name}, {selectedStudent.user.first_name}</h3>
               <span className="badge-idn">{selectedStudent.idn}</span>
               <p className="program-text">{selectedStudent.program?.name || selectedStudent.program_details?.name}</p>
            </div>

            <div className="preview-controls">
               <div className="form-group pb-4">
                 <Select 
                    label="Academic Term"
                    value={selectedTerm} 
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    options={terms.map(t => ({ value: t.id, label: `${t.code} - ${t.name}` }))}
                 />
               </div>

               <div className="info-box">
                  <Info size={16} />
                  <p>Downloading will generate a 1-page PDF including subjects and schedules for this term.</p>
               </div>

               <Button 
                className="w-full download-btn" 
                onClick={handleDownload}
                loading={downloading}
                icon={<Download size={18} />}
               >
                 Generate & Download PDF
               </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CORIssuanceTab;
