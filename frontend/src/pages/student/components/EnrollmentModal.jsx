/**
 * Richwell Portal — Enrollment Modal
 * 
 * Specialized modal for returning students to enroll for a new term.
 * Auto-fills student data and initiates the enrollment process.
 */

import React, { useState } from 'react';
import { studentsApi } from '../../../api/students';
import { User, IdentificationCard, GraduationCap, Phone, MapPin, CheckCircle } from 'lucide-react';
import './EnrollmentModal.css';

const EnrollmentModal = ({ isOpen, onClose, studentData, termData, onEnrollSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleEnroll = async () => {
        setLoading(true);
        setError(null);
        try {
            // pk is student id, for self-enroll it's in studentData.id
            await studentsApi.returningStudent(studentData.id, {});
            setSuccess(true);
            setTimeout(() => {
                onEnrollSuccess();
                onClose();
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Enrollment failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className={`modal-container ${success ? 'success' : ''}`}>
                {!success ? (
                    <>
                        <div className="modal-header">
                            <div>
                                <h2>Enroll for {termData?.code}</h2>
                                <p>Please verify your information before proceeding to subject selection.</p>
                            </div>
                            <button className="close-btn" onClick={onClose}>&times;</button>
                        </div>

                        <div className="modal-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <label><User size={14}/> Student Name</label>
                                    <div className="info-value">{studentData?.user?.first_name} {studentData?.user?.last_name}</div>
                                </div>
                                <div className="info-item">
                                    <label><IdentificationCard size={14}/> Student ID</label>
                                    <div className="info-value">{studentData?.idn}</div>
                                </div>
                                <div className="info-item">
                                    <label><GraduationCap size={14}/> Academic Program</label>
                                    <div className="info-value">{studentData?.program}</div>
                                </div>
                                <div className="info-item">
                                    <label><Phone size={14}/> Contact Number</label>
                                    <div className="info-value">{studentData?.contact_number || 'Not Set'}</div>
                                </div>
                            </div>

                            {error && <div className="error-alert">{error}</div>}

                            <div className="modal-notice">
                                <p><strong>Note:</strong> By clicking "Proceed to Enrollment", a record for the <b>{termData?.name}</b> will be created, and you will be redirected to the advising page to select your subjects.</p>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="secondary-btn" onClick={onClose}>Cancel</button>
                            <button 
                                className="primary-btn" 
                                onClick={handleEnroll}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Confirm & Proceed'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="success-content">
                        <div className="success-icon">
                            <CheckCircle size={64} className="text-emerald-500" />
                        </div>
                        <h2>Enrollment Initiated!</h2>
                        <p>Redirecting you to the subject advising portal...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnrollmentModal;
