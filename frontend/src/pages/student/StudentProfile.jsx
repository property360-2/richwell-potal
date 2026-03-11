import React from 'react';
import { User, Shield, FileCheck, Mail, MapPin, Phone, GraduationCap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Badge from '../../components/ui/Badge';
import './StudentPortal.css';

const StudentProfile = () => {
    const { user } = useAuth();
    const profile = user?.student_profile;

    if (!profile) return <div className="p-8">No student profile found.</div>;

    const documentStatus = [
        { name: 'Form 137 / SF10', status: profile.is_verified ? 'Verified' : 'Pending', color: profile.is_verified ? 'success' : 'warning' },
        { name: 'Birth Certificate', status: profile.is_verified ? 'Verified' : 'Pending', color: profile.is_verified ? 'success' : 'warning' },
        { name: 'Good Moral', status: profile.is_verified ? 'Verified' : 'Pending', color: profile.is_verified ? 'success' : 'warning' },
        { name: 'Transfer Credentials', status: profile.is_verified ? 'Verified' : 'Pending', color: profile.is_verified ? 'success' : 'warning' },
    ];

    return (
        <div className="student-portal-container">
            <div className="portal-section profile-grid">
                <div className="profile-avatar-section">
                    <div className="avatar-large">
                        <User size={80} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-extrabold text-slate-900">{user.first_name} {user.last_name}</h2>
                        <p className="text-slate-500 font-medium">{profile.idn}</p>
                    </div>
                    <Badge variant={profile.is_verified ? 'success' : 'warning'} className="mt-2 py-1.5 px-4 text-sm">
                        {profile.is_verified ? 'Officially Enrolled' : 'Pending Verification'}
                    </Badge>
                </div>

                <div className="profile-details">
                    <div className="section-header">
                        <h3 className="section-title"><Shield size={20} className="text-blue-500" /> Academic Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                        <InfoItem label="Program" value={`${profile.program_code} - ${profile.program_name}`} />
                        <InfoItem label="Year Level" value={profile.year_level_display} />
                        <InfoItem label="Student Type" value={profile.student_type_display} />
                        <InfoItem label="Current Term" value="1st Semester 2023-2024" />
                    </div>

                    <div className="section-header mt-8">
                        <h3 className="section-title"><Mail size={20} className="text-purple-500" /> Contact & Personal</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                        <InfoItem label="Email Address" value={user.email} />
                        <InfoItem label="Contact Number" value={profile.contact_number || 'Not provided'} />
                        <InfoItem label="Permanent Address" value={profile.address || 'Not provided'} />
                        <InfoItem label="Date of Birth" value={profile.birth_date || 'Not provided'} />
                    </div>
                </div>
            </div>

            <div className="portal-section">
                <div className="section-header">
                    <h3 className="section-title"><FileCheck size={20} className="text-emerald-500" /> Document Verification Progress</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {documentStatus.map((doc, idx) => (
                        <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{doc.name}</p>
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{doc.status}</span>
                                <div className={`w-3 h-3 rounded-full bg-${doc.color === 'success' ? 'emerald' : 'amber'}-500 shadow-sm`} />
                            </div>
                        </div>
                    ))}
                </div>
                {!profile.is_verified && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-amber-800 text-sm">
                        <div className="flex-shrink-0 mt-0.5 font-bold">⚠️</div>
                        <p>Some documents are still under review by the Registrar. Please visit the office if you have any questions.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoItem = ({ label, value }) => (
    <div className="info-group">
        <p className="info-label">{label}</p>
        <p className="info-value">{value}</p>
    </div>
);

export default StudentProfile;
