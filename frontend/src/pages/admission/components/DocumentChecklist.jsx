/**
 * Document Checklist Component
 * Renders the interactive checklist for verifying applicant documents.
 */
import React from 'react';
import { FileText, Check } from 'lucide-react';
import Button from '../../../components/ui/Button';

const DocumentChecklist = ({ checklist, onToggle, onMarkAll, onSave }) => {
  return (
    <div style={{height: '100%'}}>
      <section className="checklist-panel">
        <div className="checklist-header">
          <h4 className="checklist-title">
              <FileText size={14} style={{color: 'var(--color-primary)'}} /> Document Tracking
          </h4>
          <div className="checklist-actions">
            <button type="button" onClick={() => onMarkAll(true)} className="checklist-btn primary">All</button>
            <button type="button" onClick={() => onMarkAll(false)} className="checklist-btn secondary">Clear</button>
          </div>
        </div>

        <div className="checklist-items">
            {Object.keys(checklist).map(key => {
              const isChecked = checklist[key].submitted;
              return (
              <label 
                key={key} 
                className={`checklist-item ${isChecked ? 'checked' : ''}`}
              >
                  <div className="check-box-icon">
                    {isChecked && <Check size={14} strokeWidth={4} />}
                  </div>

                  <span className="check-label">
                    {key.replace(/_/g, ' ')}
                  </span>

                  {isChecked && <div className="check-verified-badge">Verified</div>}

                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={() => onToggle(key)}
                    style={{display: 'none'}}
                  />
              </label>
            )})}
        </div>
        
        <div className="checklist-save-btn">
          <Button variant="secondary" style={{width: '100%'}} onClick={onSave}>
            Save Progress Only
          </Button>
        </div>
      </section>
    </div>
  );
};

export default DocumentChecklist;
