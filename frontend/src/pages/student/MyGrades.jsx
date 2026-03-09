import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { gradesApi } from '../../api/grades';
import './MyGrades.css';

const MyGrades = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const res = await gradesApi.getGrades();
      setGrades(res.data.results || []);
    } catch (error) {
      console.error('Failed to fetch grades:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group grades by term
  const groupedGrades = grades.reduce((acc, grade) => {
    const termCode = grade.term_details?.code || 'Transfer Credits / Historical';
    if (!acc[termCode]) {
      acc[termCode] = [];
    }
    acc[termCode].push(grade);
    return acc;
  }, {});

  const columns = [
    { 
      header: 'Subject Code', 
      render: (grade) => <span className="font-bold text-slate-800">{grade.subject_details?.code}</span>
    },
    { 
      header: 'Description', 
      render: (grade) => (
        <div className="text-slate-600">
          {grade.subject_details?.description}
          {grade.is_credited && <Badge variant="info" size="sm" style={{ marginLeft: '8px' }}>Credited</Badge>}
        </div>
      )
    },
    { header: 'Units', render: (grade) => grade.subject_details?.total_units },
    { 
      header: 'Grade', 
      render: (grade) => (
        <span className={`font-mono font-bold ${grade.grade_status === 'PASSED' ? 'text-success' : grade.grade_status === 'FAILED' ? 'text-error' : 'text-slate-500'}`}>
          {grade.final_grade || grade.grade_status_display}
        </span>
      )
    },
    {
      header: 'Status',
      render: (grade) => (
        <Badge variant={grade.grade_status === 'PASSED' ? 'success' : grade.grade_status === 'ENROLLED' ? 'info' : 'warning'}>
          {grade.grade_status_display}
        </Badge>
      )
    }
  ];

  if (loading) return <LoadingSpinner size="lg" style={{ marginTop: '80px' }} />;

  const termKeys = Object.keys(groupedGrades).sort().reverse();

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Academic Records</h1>
          <p className="text-slate-500 mt-1">View your full grade history and credited subjects.</p>
        </div>
      </div>

      {termKeys.length > 0 ? (
        termKeys.map(term => (
          <div key={term} className="space-y-4">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full"></span>
              Term: {term}
            </h2>
            <Card className="overflow-hidden">
               <Table 
                 columns={columns} 
                 data={groupedGrades[term]} 
                 border={false}
               />
            </Card>
          </div>
        ))
      ) : (
        <Card className="text-center py-12">
          <p className="text-slate-400">No academic records found.</p>
        </Card>
      )}
    </div>
  );
};

export default MyGrades;
