/**
 * File: ManageHeader.jsx
 * Description: Renders the header section for the load management and section configuration view.
 */

import React from 'react';
import { BookOpen } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import styles from '../SchedulingPage.module.css';

const ManageHeader = ({ 
    selectedProf, 
    selectedSection, 
    calculateTotalUnits, 
    onBack 
}) => {
    return (
        <div className={styles.manageHeader}>
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={onBack}>Back to Matrix</Button>
                <div className={styles.headerTitleSection}>
                    <h2 className="text-xl font-bold">
                        {selectedProf ? 'Assign Faculty Load' : 'Section Timetable Configuration'}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {selectedProf 
                            ? `Faculty: ${selectedProf?.user?.first_name} ${selectedProf?.user?.last_name} • ${selectedProf?.employee_id}`
                            : `Target: ${selectedSection?.name} (${selectedSection?.program_name})`
                        }
                    </p>
                </div>
            </div>
            {selectedProf && (
                <div className={`${styles.statsCardCompact} flex items-center gap-4`}>
                    <div className="text-right">
                        <div className={`${styles.statsLabel} text-[10px] font-black text-slate-400 uppercase`}>Total Current Load</div>
                        <div className={`${styles.statsValue} text-lg font-black text-slate-700`}>
                            {calculateTotalUnits()} <span className="text-sm font-medium opacity-50">/ 30 UNITS</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <BookOpen size={20} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageHeader;
