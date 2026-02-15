import React, { useState, useMemo, useEffect } from 'react';
import { 
    UserPlus, 
    Mail, 
    User as UserIcon, 
    Lock,
    Loader2,
    Shield,
    GraduationCap,
    Building,
    AlertCircle,
    CheckCircle2,
    RefreshCcw
} from 'lucide-react';
import { AdminService } from '../services/AdminService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

// Based on defined RBAC rules
const CREATION_PERMISSIONS = {
    // Admin: Can create everything
    ADMIN: ['ADMIN', 'REGISTRAR', 'HEAD_REGISTRAR', 'ADMISSION_STAFF', 'CASHIER', 'DEPARTMENT_HEAD', 'PROFESSOR', 'STUDENT'],
    
    // Registrar: Can create Professors and Students
    REGISTRAR: ['PROFESSOR', 'STUDENT'],
    HEAD_REGISTRAR: ['PROFESSOR', 'STUDENT', 'REGISTRAR'],
    
    // Admission Staff: Can create Students only
    ADMISSION_STAFF: ['STUDENT'],

    // Others: No creation rights
    DEPARTMENT_HEAD: [],
    PROFESSOR: [],
    STUDENT: [],
    CASHIER: []
};

const ALL_ROLES = [
    // { value: 'STUDENT', label: 'Student' }, // Disabled as per request
    { value: 'PROFESSOR', label: 'Professor' },
    { value: 'REGISTRAR', label: 'Registrar' },
    { value: 'HEAD_REGISTRAR', label: 'Head Registrar' },
    { value: 'ADMISSION_STAFF', label: 'Admission Staff' },
    { value: 'DEPARTMENT_HEAD', label: 'Department Head' },
    { value: 'CASHIER', label: 'Cashier' },
    { value: 'ADMIN', label: 'Admin' }
];

const PROGRAM_OPTIONS = [
    { value: 'BSIT', label: 'BSIT - Information Technology' },
    { value: 'BSIS', label: 'BSIS - Information Systems' },
    { value: 'BSCS', label: 'BSCS - Computer Science' },
    { value: 'BSBA', label: 'BSBA - Business Administration' }
];

const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const { success, error } = useToast();
    const [loading, setLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState({ email: null, student_number: null, password: null });
    const [isValidating, setIsValidating] = useState({ email: false, student_number: false });
    const [isGeneratingId, setIsGeneratingId] = useState(false);
    
    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        confirm_password: '',
        role: 'PROFESSOR',
        program: 'BSIT',
        student_number: ''
    });

    // Reset validation when modal opens
    useEffect(() => {
        if (isOpen) {
            setValidationErrors({ email: null, student_number: null, password: null });
            setIsValidating({ email: false, student_number: false });
        }
    }, [isOpen]);

    // Filter roles based on current user's role
    const allowedRoles = useMemo(() => {
        if (!user) return [];
        if (user.is_superuser) return ALL_ROLES;

        const allowed = CREATION_PERMISSIONS[user.role] || [];
        return ALL_ROLES.filter(r => allowed.includes(r.value));
    }, [user]);

    // If only one role is allowed (e.g. Admission Staff -> Student), default to it
    React.useEffect(() => {
        if (allowedRoles.length > 0 && !allowedRoles.find(r => r.value === formData.role)) {
            setFormData(prev => ({ ...prev, role: allowedRoles[0].value }));
        }
    }, [allowedRoles, formData.role]);

    // Debounce validation for email
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.email && formData.email.includes('@')) {
                validateField('email', formData.email);
            } else {
                setValidationErrors(prev => ({ ...prev, email: null }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [formData.email]);

    // Debounce validation for student number
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.role === 'STUDENT' && formData.student_number) {
                validateField('student_number', formData.student_number);
            } else {
                setValidationErrors(prev => ({ ...prev, student_number: null }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [formData.student_number, formData.role]);
    
    // Validate Password Match
    useEffect(() => {
        if (formData.confirm_password && formData.password !== formData.confirm_password) {
            setValidationErrors(prev => ({ ...prev, password: "Passwords do not match" }));
        } else if (formData.password && formData.password.length < 8) {
            setValidationErrors(prev => ({ ...prev, password: "Password must be at least 8 characters" }));
        } else {
            setValidationErrors(prev => ({ ...prev, password: null }));
        }
    }, [formData.password, formData.confirm_password]);

    const validateField = async (field, value) => {
        if (!value) return;
        
        setIsValidating(prev => ({ ...prev, [field]: true }));
        try {
            // Use AdminService to check for existing users
            // Include students in the search to prevent duplicate emails/IDs across roles
            const response = await AdminService.getUsers({ 
                search: value,
                include_students: true 
            });
            const users = response.users || [];
            
            // Check for exact match
            const duplicate = users.find(u => {
                if (field === 'email') return u.email.toLowerCase() === value.toLowerCase();
                if (field === 'student_number') return u.student_number === value;
                return false;
            });

            if (duplicate) {
                setValidationErrors(prev => ({ 
                    ...prev, 
                    [field]: `${field === 'email' ? 'Email' : 'ID'} already taken by ${duplicate.full_name} (${duplicate.role})` 
                }));
            } else {
                setValidationErrors(prev => ({ ...prev, [field]: null }));
            }
        } catch (err) {
            console.error('Validation error:', err);
        } finally {
            setIsValidating(prev => ({ ...prev, [field]: false }));
        }
    };

    const generateStudentId = async () => {
        setIsGeneratingId(true);
        try {
            const response = await AdminService.generateStudentId();
            const newId = response.student_id;
            
            if (newId) {
                setFormData(prev => ({ ...prev, student_number: newId }));
                setValidationErrors(prev => ({ ...prev, student_number: null }));
                success(`Generated Student ID: ${newId}`);
            } else {
                error('Could not generate ID');
            }
        } catch (err) {
            console.error('ID Generation Error:', err);
            error('Failed to generate Student ID');
        } finally {
            setIsGeneratingId(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Block submission if there are validation errors
        if (validationErrors.email || validationErrors.student_number || validationErrors.password) {
            error('Please fix validation errors before submitting');
            return;
        }

        // Validation
        if (formData.password !== formData.confirm_password) {
            error('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            error('Password must be at least 8 characters');
            return;
        }

        try {
            setLoading(true);
            await AdminService.createUser({
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                password: formData.password,
                role: formData.role,
                program: formData.role === 'STUDENT' ? formData.program : undefined,
                student_number: formData.role === 'STUDENT' ? formData.student_number : undefined
            });
            
            success('User created successfully');
            
            // Reset form
            setFormData({
                email: '',
                first_name: '',
                last_name: '',
                password: '',
                confirm_password: '',
                role: allowedRoles[0]?.value || 'PROFESSOR',
                program: 'BSIT',
                student_number: ''
            });
            setValidationErrors({ email: null, student_number: null, password: null });
            
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Create user error:', err);
            
            // Handle specific validation errors from backend
            let handled = false;
            const errorMessage = err.message || '';
            const errorData = err.data || {};

            if (errorMessage.toLowerCase().includes('email') || errorData.email) {
                setValidationErrors(prev => ({ 
                    ...prev, 
                    email: errorData.email?.[0] || 'This email address is already in use.' 
                }));
                handled = true;
            }

            if (errorMessage.toLowerCase().includes('student number') || errorData.student_number) {
                setValidationErrors(prev => ({ 
                    ...prev, 
                    student_number: errorData.student_number?.[0] || 'This student number is already in use.' 
                }));
                handled = true;
            }

            // Always show toast for general errors, or specific ones if not handled inline
            if (!handled) {
                error(errorMessage || 'Failed to create user');
            } else {
                // Determine if we should show a toast as well?
                // User said "validation or warning is nasa modal din" - implies they want it inline.
                // Toast might be redundant if inline is shown, but safer to show a generic "Validation failed" toast.
                error('Please fix the highlighted errors.');
            }
        } finally {
            setLoading(false);
        }
    };

    const isStudent = formData.role === 'STUDENT';
    const hasErrors = validationErrors.email || validationErrors.student_number || validationErrors.password;
    const isChecking = isValidating.email || isValidating.student_number;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Add New User"
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Role Selection */}
                <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">
                        <Shield className="w-3 h-3 inline mr-1" />
                        User Role
                    </label>
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                    >
                        {allowedRoles.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    {allowedRoles.length === 0 && (
                        <p className="text-red-500 text-xs mt-1">You do not have permission to create users.</p>
                    )}
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">
                            <UserIcon className="w-3 h-3 inline mr-1" />
                            First Name
                        </label>
                        <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                            placeholder="John"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">
                            Last Name
                        </label>
                        <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                            placeholder="Doe"
                        />
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">
                        <Mail className="w-3 h-3 inline mr-1" />
                        Email Address
                    </label>
                    <div className="relative">
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none transition-all font-bold text-gray-900 ${
                                validationErrors.email 
                                    ? 'border-red-300 focus:border-red-500' 
                                    : 'border-transparent focus:border-blue-500 focus:bg-white'
                            }`}
                            placeholder="user@richwell.edu"
                        />
                        {isValidating.email && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                        )}
                        {!isValidating.email && !validationErrors.email && formData.email && formData.email.includes('@') && (
                            <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                        )}
                    </div>
                    {validationErrors.email && (
                        <p className="mt-1 text-xs font-bold text-red-500 flex items-center animate-in slide-in-from-top-1">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {validationErrors.email}
                        </p>
                    )}
                </div>

                {/* Student-specific fields */}
                {isStudent && (
                    <>
                        <div>
                            <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">
                                <GraduationCap className="w-3 h-3 inline mr-1" />
                                Program
                            </label>
                            <select
                                name="program"
                                value={formData.program}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                            >
                                {PROGRAM_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">
                                <Building className="w-3 h-3 inline mr-1" />
                                Student Number
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="student_number"
                                    value={formData.student_number}
                                    onChange={handleChange}
                                    required={isStudent}
                                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none transition-all font-bold text-gray-900 ${
                                        validationErrors.student_number 
                                            ? 'border-red-300 focus:border-red-500' 
                                            : 'border-transparent focus:border-blue-500 focus:bg-white'
                                    }`}
                                    placeholder="2025-00001"
                                />
                                <button
                                    type="button"
                                    onClick={generateStudentId}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    title="Generate unique Student ID"
                                >
                                    {isGeneratingId ? (
                                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                    ) : (
                                        <RefreshCcw className="w-4 h-4 text-blue-500 hover:text-blue-600 transition-transform hover:rotate-180" />
                                    )}
                                </button>
                                {isValidating.student_number && (
                                    <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                                )}
                                {!isValidating.student_number && !validationErrors.student_number && formData.student_number && (
                                    <CheckCircle2 className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                )}
                            </div>
                            {validationErrors.student_number && (
                                <p className="mt-1 text-xs font-bold text-red-500 flex items-center animate-in slide-in-from-top-1">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {validationErrors.student_number}
                                </p>
                            )}
                        </div>
                    </>
                )}

                {/* Password Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">
                            <Lock className="w-3 h-3 inline mr-1" />
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={8}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            name="confirm_password"
                            value={formData.confirm_password}
                            onChange={handleChange}
                            required
                            minLength={8}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                            placeholder="••••••••"
                        />
                    </div>
                </div>
                {validationErrors.password && (
                    <p className="mt-1 text-xs font-bold text-red-500 flex items-center animate-in slide-in-from-top-1">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {validationErrors.password}
                    </p>
                )}

                {/* Info Message */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">
                        <strong>Security Note:</strong> Please ensure you share these credentials securely with the user.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button 
                        variant="secondary" 
                        onClick={onClose}
                        disabled={loading}
                    >
                        CANCEL
                    </Button>
                    <Button 
                        variant="primary" 
                        type="submit"
                        icon={loading ? Loader2 : UserPlus}
                        disabled={loading || allowedRoles.length === 0 || hasErrors}
                        className="shadow-lg shadow-blue-500/20"
                    >
                        {loading ? 'CREATING...' : 'CREATE USER'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default AddUserModal;
