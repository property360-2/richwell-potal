import React from 'react';
import Card from '../../components/ui/Card';

const ProfessorResolutions = () => {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">INC Resolutions</h1>
          <p className="text-slate-500 mt-1">Manage and resolve Incomplete (INC) grades for your students.</p>
        </div>
      </div>

      <Card className="p-12 text-center border-dashed">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <span className="text-2xl text-slate-400">📝</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-700">No Pending Resolutions</h3>
          <p className="text-slate-500 max-w-md">
            You currently have no pending INC grade resolution requests. When students request resolution for incomplete grades, they will appear here.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ProfessorResolutions;
