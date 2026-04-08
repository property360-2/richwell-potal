/**
 * Admission Approval Panel Component
 * Handles the input for the monthly commitment ammount and displays final admission instructions.
 */
import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import Input from '../../../components/ui/Input';

const AdmissionApprovalPanel = ({ monthlyCommitment, setMonthlyCommitment }) => {
  return (
    <section className="admission-panel">
        <ShieldCheck size={100} className="admission-panel-icon" />
        
        <div style={{position: 'relative', zIndex: 10}}>
          <h4 className="admission-panel-title">
            <CheckCircle2 size={16} /> Final Review & Admission
          </h4>
          <p>
            Verify all documents below before admitting. You must specify the <strong>Monthly Payment Commitment</strong> for the financial agreement.
          </p>
          
          <div className="admission-input-wrapper">
            <Input 
              label="Monthly Payment Commitment" 
              type="number" 
              placeholder="e.g. 5000"
              value={monthlyCommitment}
              onChange={(e) => setMonthlyCommitment(e.target.value)}
              icon={<span style={{fontWeight: 'bold', color: '#94a3b8'}}>₱</span>}
            />
          </div>
        </div>
    </section>
  );
};

export default AdmissionApprovalPanel;
