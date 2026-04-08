/**
 * AcademicStep — Step 3 of the student application form.
 * 
 * This component allows the student to select their preferred degree program. 
 * It also displays confirmation of the auto-assigned curriculum for transparency.
 * 
 * @param {Object} props - Component props.
 * @param {Function} props.register - React Hook Form's register function.
 * @param {Object} props.errors - React Hook Form's current error state.
 * @param {Array} props.programs - List of active academic programs.
 * @param {Array} props.curriculums - List of curricula associated with the selected program.
 * @returns {JSX.Element} The rendered step content.
 */

import React from 'react';
import { GraduationCap, CheckCircle2 } from 'lucide-react';
import Select from '../../../../components/ui/Select';

const AcademicStep = ({ register, errors, programs, curriculums }) => {
  return (
    <div className="apply-step-card" key="step-3">
      <div className="step-header">
        <div className="step-header-icon"><GraduationCap size={24} /></div>
        <div>
          <h2>Academic Preference</h2>
          <p>Choose the program you want to pursue</p>
        </div>
      </div>

      <div className="space-y-6">
        <Select
          label="Preferred Program"
          placeholder="Search or select a program"
          {...register('program', { required: 'Program selection is required' })}
          options={programs.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
          error={errors.program?.message}
          fullWidth
        />

      </div>
    </div>
  );
};

export default AcademicStep;
