/**
 * File: FacultyMatrix.jsx
 * Description: Renders the faculty load matrix table for the Scheduling Dashboard.
 */

import React from 'react';
import { BookOpen, CheckCircle2, AlertTriangle, Edit2 } from 'lucide-react';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import styles from '../SchedulingPage.module.css';

const FacultyMatrix = ({ filteredProfs, onManageLoad }) => {
    return (
        <table className={styles.matrixTable}>
            <thead>
                <tr>
                    <th>Faculty Member</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Hours Loaded</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                {filteredProfs.map(prof => (
                    <tr key={prof.id}>
                        <td>
                            <div className="flex items-center gap-3">
                                <div className={styles.profAvatarSmall}>
                                    {prof.user?.last_name?.[0]}
                                </div>
                                <div className="font-bold text-slate-700">
                                    {prof.user?.first_name} {prof.user?.last_name}
                                </div>
                            </div>
                        </td>
                        <td className="font-bold text-xs text-slate-400">{prof.employee_id}</td>
                        <td className="text-sm font-medium text-slate-500">{prof.department}</td>
                        <td>
                            <Badge variant="neutral">{prof.hours_assigned} hrs Assigned</Badge>
                        </td>
                        <td>
                            {prof.assignment_count > 0 ? (
                                <Badge variant="success" icon={<CheckCircle2 size={10} />}>Configured</Badge>
                            ) : (
                                <Badge variant="warning" icon={<AlertTriangle size={10} />}>No Load</Badge>
                            )}
                        </td>
                        <td className="text-center">
                            <Button 
                                variant="primary" 
                                size="xs" 
                                style={{ fontWeight: 800 }} 
                                icon={<Edit2 size={12}/>}
                                onClick={() => onManageLoad(prof)}
                            >
                                MANAGE LOAD
                            </Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default FacultyMatrix;
