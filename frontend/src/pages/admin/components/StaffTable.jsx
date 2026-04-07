/**
 * @file StaffTable.jsx
 * @description Renders the staff members table with actions.
 */

import React from 'react';
import { KeyRound, Edit2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';

/**
 * StaffTable Component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.data - Staff data array
 * @param {boolean} props.loading - Loading state
 * @param {string} props.searchQuery - Current search query
 * @param {Function} props.onEdit - Function to handle edit action
 * @param {Function} props.onResetPassword - Function to handle password reset
 * @returns {JSX.Element}
 */
const StaffTable = ({ data, loading, searchQuery, onEdit, onResetPassword }) => {
  const columns = [
    { header: 'Username', accessor: 'username' },
    { 
      header: 'Name', 
      render: (row) => `${row.first_name} ${row.last_name}`
    },
    { header: 'Email', accessor: 'email' },
    { 
      header: 'Role', 
      render: (row) => <Badge variant="info">{row.role.replace('_', ' ')}</Badge>
    },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'neutral'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<KeyRound size={16} />} 
            onClick={() => onResetPassword(row.id)}
            title="Reset Password"
          />
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<Edit2 size={16} />} 
            onClick={() => onEdit(row)}
            title="Edit"
          />
        </div>
      )
    }
  ];

  return (
    <Table 
      columns={columns} 
      data={data} 
      loading={loading} 
      emptyMessage={searchQuery ? "No staff matches your search." : "No staff members found."}
    />
  );
};

export default StaffTable;
