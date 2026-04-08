/**
 * RosterModal.jsx
 * 
 * Detailed modal providing a view of a section's student roster and class schedule.
 * Includes hooks for starting the student transfer process.
 */

import React, { useState } from 'react';
import { Users, Clock } from 'lucide-react';
import Modal from '../../../../components/ui/Modal';
import Tabs from '../../../../components/ui/Tabs';
import Table from '../../../../components/ui/Table';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';

/**
 * RosterModal Component
 * 
 * @param {Object} props
 * @param {Boolean} props.isOpen - Modal visibility
 * @param {Function} props.onClose - Close callback
 * @param {Object} props.section - Selected section data
 * @param {Array} props.roster - List of students
 * @param {Array} props.schedules - List of class schedules
 * @param {Boolean} props.loading - Data fetching state
 * @param {Function} props.onTransfer - Callback to initiate student transfer
 */
const RosterModal = ({ 
  isOpen, 
  onClose, 
  section, 
  roster, 
  schedules, 
  loading, 
  onTransfer 
}) => {
  const [modalTab, setModalTab] = useState('students');

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
        <Button 
          variant="ghost" 
          size="xs" 
          style={{ color: 'var(--color-primary)', fontWeight: 'bold' }} 
          onClick={() => onTransfer(row)}
        >
          Transfer
        </Button>
      )
    }
  ];

  const scheduleColumns = [
    { header: 'Subject', accessor: 'subject_code' },
    { 
        header: 'Professor', 
        render: (row) => (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700 }}>{row.professor_name || 'TBA'}</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{row.component_type}</span>
            </div>
        )
    },
    { 
        header: 'Schedule', 
        render: (row) => row.days?.length > 0 && row.start_time && row.end_time ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700 }}>{row.days.join('')}</span>
                <span style={{ fontSize: '10px' }}>{String(row.start_time).substring(0,5)} - {String(row.end_time).substring(0,5)}</span>
            </div>
        ) : 'TBA'
    },
    { header: 'Room', render: (row) => row.room_name || 'AUTO/TBA' }
  ];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`${section?.name} Overview`}
      size="lg"
    >
      <Tabs 
        activeTab={modalTab}
        onTabChange={setModalTab}
        tabs={[
          { id: 'students', label: 'Student Roster', icon: Users },
          { id: 'schedule', label: 'Class Schedule', icon: Clock }
        ]}
        className="mb-6"
      />

      {modalTab === 'students' ? (
        <Table columns={rosterColumns} data={roster} loading={loading} />
      ) : (
        <div className="animate-in fade-in duration-300">
          <Table columns={scheduleColumns} data={schedules} loading={loading} />
          {schedules.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
              <Clock size={32} style={{ margin: '0 auto var(--space-4)', opacity: 0.2 }} />
              <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase' }}>No schedule assigned yet</p>
              <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>The Dean must publish the timetable for this section.</p>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

export default RosterModal;
