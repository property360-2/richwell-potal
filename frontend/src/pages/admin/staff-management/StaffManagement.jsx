/**
 * @file StaffManagement.jsx
 * @description Main container for managing staff members. 
 * Provides search and orchestration for the staff table and modal components.
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { Plus } from 'lucide-react';
import Pagination from '../../components/ui/Pagination';
import StaffTable from './components/StaffTable';
import StaffModal from './components/StaffModal';

/**
 * StaffManagement Component
 * 
 * Manages the staff module's state, data fetching, and modal orchestration.
 * 
 * @returns {JSX.Element}
 */
const StaffManagement = () => {
  const { role: currentUserRole } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaffMember, setSelectedStaffMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showToast } = useToast();

  /**
   * Fetches the staff members from the API based on current page and search.
   */
  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('accounts/staff/', {
        params: {
          search: searchQuery,
          page: page
        }
      });
      if (res.data.results) {
        setStaff(res.data.results);
        setTotalPages(Math.ceil(res.data.count / 20));
      } else {
        setStaff(res.data);
        setTotalPages(1);
      }
    } catch (err) {
      showToast('error', 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStaff();
    }, 400); 
    return () => clearTimeout(timer);
  }, [searchQuery, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  /**
   * Opens the staff modal for adding/editing.
   * @param {Object} [staffMember=null] - The staff member object to edit.
   */
  const handleOpenModal = (staffMember = null) => {
    setSelectedStaffMember(staffMember);
    setModalOpen(true);
  };

  /**
   * Triggers a password reset for a specific user ID.
   * @param {string|number} id - User ID
   */
  const handleResetPassword = async (id) => {
    if (!window.confirm('Are you sure you want to reset this user\'s password?')) return;
    try {
      const res = await api.post(`accounts/staff/${id}/reset-password/`);
      showToast('success', res.data.detail || 'Password reset successfully');
    } catch (err) {
      showToast('error', 'Failed to reset password');
    }
  };

  return (
    <div className="page-container space-y-8">
      <div className="page-header">
        <div className="header-title-section">
          <h2>Staff Management</h2>
          <p>Manage administrators, registrars, deans, and other personnel.</p>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => handleOpenModal()}>
          Add Staff
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100">
          <Input 
            placeholder="Search staff by name, username, email or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        <StaffTable 
          data={staff} 
          loading={loading} 
          searchQuery={searchQuery} 
          onEdit={handleOpenModal} 
          onResetPassword={handleResetPassword} 
        />
        {totalPages > 1 && (
          <div className="pagination-wrapper">
            <Pagination 
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      <StaffModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        staffMember={selectedStaffMember} 
        onSuccess={fetchStaff} 
        currentUserRole={currentUserRole} 
      />
    </div>
  );
};

export default StaffManagement;
