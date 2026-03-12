import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, GraduationCap, ShieldCheck, Send,
  CheckCircle2, ChevronRight, ChevronLeft, Check
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { academicsApi } from '../api/academics';
import { studentsApi } from '../api/students';
import './PublicApplication.css';

const STEPS = [
  { label: 'Personal', icon: User },
  { label: 'Contact', icon: Mail },
  { label: 'Academic', icon: GraduationCap },
  { label: 'Guardian', icon: ShieldCheck },
  { label: 'Review', icon: Send },
];

// Fields required per step (for per-step validation)
const STEP_FIELDS = {
  1: ['first_name', 'last_name', 'date_of_birth', 'gender', 'student_type'],
  2: ['email', 'contact_number', 'address_municipality', 'address_barangay'],
  3: ['program'],
  4: ['guardian_name', 'guardian_contact'],
  5: [],
};

const PublicApplication = () => {
  const { register, handleSubmit, watch, setValue, trigger, getValues, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      student_type: 'FRESHMAN',
      gender: 'MALE'
    }
  });
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [programs, setPrograms] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [locations, setLocations] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const selectedProgramId = watch('program');
  const selectedMunicipality = watch('address_municipality');
  const studentType = watch('student_type');

  // SEO
  useEffect(() => {
    document.title = "Apply Now — Richwell Colleges Online Enrollment";
  }, []);

  // Fetch programs + locations on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progRes, locRes] = await Promise.all([
          academicsApi.getPrograms({ is_active: true }),
          academicsApi.getLocations()
        ]);
        setPrograms(progRes.data.results || progRes.data);
        setLocations(locRes.data);
      } catch (err) {
        addToast('error', 'Failed to load application data');
      }
    };
    fetchData();
  }, []);

  // Auto-pick curriculum when program changes
  useEffect(() => {
    if (selectedProgramId) {
      const fetchCurriculums = async () => {
        try {
          const res = await academicsApi.getCurriculums({ program: selectedProgramId, is_active: true });
          const currs = res.data.results || res.data;
          setCurriculums(currs);
          if (currs && currs.length > 0) {
            setValue('curriculum', currs[0].id);
          }
        } catch (err) {
          addToast('error', 'Failed to load curriculums');
        }
      };
      fetchCurriculums();
    }
  }, [selectedProgramId]);

  // Update barangays when municipality changes
  useEffect(() => {
    if (selectedMunicipality && locations) {
      setBarangays(locations[selectedMunicipality] || []);
    }
  }, [selectedMunicipality, locations]);

  // Validate current step and advance
  const handleNext = async () => {
    // For transferees, also validate previous_school in step 1
    const fieldsToValidate = [...STEP_FIELDS[currentStep]];
    if (currentStep === 1 && studentType === 'TRANSFEREE') {
      fieldsToValidate.push('previous_school');
    }

    const valid = await trigger(fieldsToValidate);
    if (valid) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (data) => {
    try {
      await studentsApi.apply(data);
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err) {
      const apiErrors = err.response?.data;
      if (apiErrors && typeof apiErrors === 'object' && !apiErrors.error) {
        const fieldErrors = Object.entries(apiErrors).map(([key, value]) => `${key}: ${value}`).join(', ');
        addToast('error', `Validation Error: ${fieldErrors}`);
      } else {
        addToast('error', err.response?.data?.error || 'Failed to submit application');
      }
    }
  };

  // Helper: strip non-digits from phone input
  const handlePhoneInput = (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
  };

  // Look up display text for select values
  const getProgramName = (id) => {
    const p = programs.find(p => String(p.id) === String(id));
    return p ? `${p.code} - ${p.name}` : id || '—';
  };

  // --- SUCCESS STATE ---
  if (submitted) {
    return (
      <div className="apply-success">
        <div className="success-card">
          <div className="success-icon">
            <CheckCircle2 size={40} />
          </div>
          <h1>Application Submitted!</h1>
          <p>
            Thank you for applying to Richwell Colleges. 
            Please wait for an email with your appointment date for document verification.
          </p>
          <Button variant="primary" fullWidth onClick={() => window.location.reload()}>
            Submit Another Application
          </Button>
        </div>
      </div>
    );
  }

  const values = getValues();

  // --- MAIN FORM ---
  return (
    <div className="apply-page">
      {/* Hero */}
      <div className="apply-hero">
        <div className="hero-badge">
          <GraduationCap size={14} />
          A.Y. 2026–2027 Enrollment
        </div>
        <h1>Richwell Colleges</h1>
        <p>Online Student Application Form</p>
      </div>

      {/* Stepper */}
      <div className="apply-stepper">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          return (
            <React.Fragment key={stepNum}>
              {i > 0 && <div className={`step-connector ${isCompleted ? 'done' : ''}`} />}
              <div className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                <div className="step-circle">
                  {isCompleted ? <Check size={20} /> : stepNum}
                </div>
                <span className="step-label">{step.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Form */}
      <div className="apply-form-container">
        <form onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" {...register('curriculum')} />

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="apply-step-card" key="step-1">
              <div className="step-header">
                <div className="step-header-icon"><User size={20} /></div>
                <div>
                  <h2>Personal Information</h2>
                  <p>Tell us about yourself</p>
                </div>
              </div>

              <div className="form-grid-3">
                <Input 
                  label="First Name" 
                  placeholder="Juan"
                  {...register('first_name', { required: 'First name is required' })} 
                  error={errors.first_name?.message} 
                />
                <Input 
                  label="Middle Name" 
                  placeholder="Santos (Optional)"
                  {...register('middle_name')} 
                />
                <Input 
                  label="Last Name" 
                  placeholder="Dela Cruz"
                  {...register('last_name', { required: 'Last name is required' })} 
                  error={errors.last_name?.message} 
                />
              </div>

              <div className="form-grid-3 form-row">
                <Input 
                  label="Date of Birth" 
                  type="date" 
                  {...register('date_of_birth', { required: 'Date of birth is required' })} 
                  error={errors.date_of_birth?.message} 
                />
                <Select 
                  label="Gender" 
                  {...register('gender', { required: 'Gender is required' })} 
                  options={[
                    { value: 'MALE', label: 'Male' },
                    { value: 'FEMALE', label: 'Female' },
                    { value: 'OTHER', label: 'Other' }
                  ]}
                  error={errors.gender?.message}
                />
                <Select 
                  label="Student Type" 
                  {...register('student_type', { required: 'Student type is required' })} 
                  options={[
                    { value: 'FRESHMAN', label: 'Freshman' },
                    { value: 'TRANSFEREE', label: 'Transferee' }
                  ]}
                  error={errors.student_type?.message}
                />
              </div>

              {studentType === 'TRANSFEREE' && (
                <div className="form-row">
                  <Input 
                    label="Previous School / University" 
                    placeholder="e.g., Bulacan State University"
                    icon={<GraduationCap size={16} />}
                    {...register('previous_school', { required: 'Previous school is required for transferees' })} 
                    error={errors.previous_school?.message} 
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Contact & Address */}
          {currentStep === 2 && (
            <div className="apply-step-card" key="step-2">
              <div className="step-header">
                <div className="step-header-icon"><Mail size={20} /></div>
                <div>
                  <h2>Contact & Address</h2>
                  <p>How can we reach you?</p>
                </div>
              </div>

              <div className="form-grid-2">
                <Input 
                  label="Email Address" 
                  type="email" 
                  placeholder="you@email.com"
                  icon={<Mail size={16} />} 
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Enter a valid email address"
                    }
                  })} 
                  error={errors.email?.message} 
                />
                <Input 
                  label="Contact Number" 
                  placeholder="09XXXXXXXXX"
                  icon={<Phone size={16} />} 
                  maxLength={11}
                  onInput={handlePhoneInput}
                  {...register('contact_number', { 
                    required: 'Contact number is required',
                    pattern: {
                      value: /^09\d{9}$/,
                      message: "Must be 11 digits starting with 09"
                    }
                  })} 
                  error={errors.contact_number?.message} 
                />
              </div>

              <div className="form-grid-2 form-row">
                <Select 
                  label="Municipality (Bulacan)" 
                  placeholder="Select Municipality"
                  icon={<MapPin size={16} />}
                  {...register('address_municipality', { required: 'Municipality is required' })} 
                  options={locations ? Object.keys(locations).map(name => ({ value: name, label: name })) : []}
                  error={errors.address_municipality?.message}
                />
                <Select 
                  label="Barangay" 
                  placeholder="Select Barangay"
                  {...register('address_barangay', { required: 'Barangay is required' })} 
                  options={barangays.map(b => ({ value: b, label: b }))}
                  disabled={!selectedMunicipality}
                  error={errors.address_barangay?.message}
                />
              </div>

              <div className="form-row">
                <Input 
                  label="Full Address (Street, House No.)" 
                  placeholder="e.g., 123 Rizal St."
                  {...register('address_full')} 
                />
              </div>
            </div>
          )}

          {/* Step 3: Academic Preference */}
          {currentStep === 3 && (
            <div className="apply-step-card" key="step-3">
              <div className="step-header">
                <div className="step-header-icon"><GraduationCap size={20} /></div>
                <div>
                  <h2>Academic Preference</h2>
                  <p>Choose the program you want to pursue</p>
                </div>
              </div>

              <Select 
                label="Preferred Program" 
                placeholder="Select a Program"
                {...register('program', { required: 'Program selection is required' })} 
                options={programs.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                error={errors.program?.message}
                fullWidth
              />

              {curriculums.length > 0 && (
                <div className="form-row" style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#166534' }}>
                      Curriculum auto-assigned: {curriculums[0]?.name || curriculums[0]?.code}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Guardian Information */}
          {currentStep === 4 && (
            <div className="apply-step-card" key="step-4">
              <div className="step-header">
                <div className="step-header-icon"><ShieldCheck size={20} /></div>
                <div>
                  <h2>Guardian Information</h2>
                  <p>Parent or guardian details</p>
                </div>
              </div>

              <div className="form-grid-2">
                <Input 
                  label="Guardian / Parent Name" 
                  placeholder="Full name"
                  {...register('guardian_name', { required: 'Guardian name is required' })} 
                  error={errors.guardian_name?.message} 
                />
                <Input 
                  label="Guardian Contact Number" 
                  placeholder="09XXXXXXXXX"
                  icon={<Phone size={16} />} 
                  maxLength={11}
                  onInput={handlePhoneInput}
                  {...register('guardian_contact', { 
                    required: 'Guardian contact is required',
                    pattern: {
                      value: /^09\d{9}$/,
                      message: "Must be 11 digits starting with 09"
                    }
                  })} 
                  error={errors.guardian_contact?.message} 
                />
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
            <div className="apply-step-card" key="step-5">
              <div className="step-header">
                <div className="step-header-icon"><Send size={20} /></div>
                <div>
                  <h2>Review & Submit</h2>
                  <p>Please verify all information before submitting</p>
                </div>
              </div>

              <div className="review-section">
                <div className="review-section-title">Personal Information</div>
                <div className="review-grid">
                  <ReviewItem label="First Name" value={values.first_name} />
                  <ReviewItem label="Middle Name" value={values.middle_name} />
                  <ReviewItem label="Last Name" value={values.last_name} />
                  <ReviewItem label="Date of Birth" value={values.date_of_birth} />
                  <ReviewItem label="Gender" value={values.gender} />
                  <ReviewItem label="Student Type" value={values.student_type} />
                  {values.student_type === 'TRANSFEREE' && (
                    <ReviewItem label="Previous School" value={values.previous_school} />
                  )}
                </div>
              </div>

              <div className="review-section">
                <div className="review-section-title">Contact & Address</div>
                <div className="review-grid">
                  <ReviewItem label="Email" value={values.email} />
                  <ReviewItem label="Contact Number" value={values.contact_number} />
                  <ReviewItem label="Municipality" value={values.address_municipality} />
                  <ReviewItem label="Barangay" value={values.address_barangay} />
                  <ReviewItem label="Full Address" value={values.address_full} />
                </div>
              </div>

              <div className="review-section">
                <div className="review-section-title">Academic Preference</div>
                <div className="review-grid">
                  <ReviewItem label="Program" value={getProgramName(values.program)} />
                </div>
              </div>

              <div className="review-section">
                <div className="review-section-title">Guardian Information</div>
                <div className="review-grid">
                  <ReviewItem label="Guardian Name" value={values.guardian_name} />
                  <ReviewItem label="Guardian Contact" value={values.guardian_contact} />
                </div>
              </div>

              <div className="certification-card">
                <p>
                  By submitting this application, I certify that all information provided is 
                  <strong> true and correct</strong>. I understand that any false information 
                  may be grounds for rejection of my application.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="apply-nav">
            <span className="step-counter">Step {currentStep} of 5</span>
            <div className="nav-buttons">
              {currentStep > 1 && (
                <Button 
                  variant="ghost" 
                  type="button"
                  icon={<ChevronLeft size={18} />} 
                  onClick={handleBack}
                >
                  Back
                </Button>
              )}
              {currentStep < 5 ? (
                <Button 
                  variant="primary" 
                  type="button"
                  onClick={handleNext}
                >
                  Continue
                  <ChevronRight size={18} style={{ marginLeft: '4px' }} />
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  type="submit" 
                  loading={isSubmitting}
                  icon={<Send size={18} />}
                >
                  Submit Application
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Small helper component for the review step
const ReviewItem = ({ label, value }) => (
  <div className="review-item">
    <div className="review-label">{label}</div>
    <div className={`review-value ${!value ? 'empty' : ''}`}>
      {value || 'Not provided'}
    </div>
  </div>
);

export default PublicApplication;
