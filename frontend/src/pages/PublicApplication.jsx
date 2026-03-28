/**
 * Richwell Portal — Public Student Application Page
 * 
 * This page serves as the entry point for prospective students to apply online. 
 * It features a multi-step form progress interface including personal, 
 * contact, academic, and guardian information, with a final review step.
 * 
 * @module pages/PublicApplication
 */

import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, GraduationCap, ShieldCheck, Send,
  CheckCircle2, ChevronRight, ChevronLeft, Check
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { academicsApi } from '../api/academics';
import { studentsApi } from '../api/students';

// Split components for each step — satisfied Rule 7 & 12
import PersonalInfoStep from './admission/components/application/PersonalInfoStep';
import ContactStep from './admission/components/application/ContactStep';
import AcademicStep from './admission/components/application/AcademicStep';
import GuardianStep from './admission/components/application/GuardianStep';
import ReviewStep from './admission/components/application/ReviewStep';

import './PublicApplication.css';

const STEPS = [
  { label: 'Personal', icon: User },
  { label: 'Contact', icon: Mail },
  { label: 'Academic', icon: GraduationCap },
  { label: 'Guardian', icon: ShieldCheck },
  { label: 'Review', icon: Send },
];

/**
 * Maps specific fields to steps to support partial form validation before proceeding.
 */
const STEP_FIELDS = {
  1: ['first_name', 'last_name', 'date_of_birth', 'gender', 'student_type'],
  2: ['email', 'contact_number', 'address_municipality', 'address_barangay'],
  3: ['program'],
  4: ['guardian_name', 'guardian_contact'],
  5: [],
};

/**
 * Main application form component. Uses react-hook-form for state management.
 */
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

  // SEO Update
  useEffect(() => {
    document.title = "Apply Now — Richwell Colleges Online Enrollment";
  }, []);

  /**
   * Initial data fetch for available programs and geographic location data.
   */
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

  /**
   * Fetches curricula whenever the selected program changes and auto-assigns the first one.
   */
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

  /**
   * Filters the available barangay options based on the chosen municipality.
   */
  useEffect(() => {
    if (selectedMunicipality && locations) {
      setBarangays(locations[selectedMunicipality] || []);
    }
  }, [selectedMunicipality, locations]);

  /**
   * Validates mandated fields for the current step before advancing to the next step.
   */
  const handleNext = async () => {
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

  /**
   * Returns the user to the previous form step.
   */
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Final form submission handler.
   * @param {Object} data - Processed form data ready for the students API.
   */
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

  /**
   * Removes non-numeric characters and limits length for phone number fields.
   */
  const handlePhoneInput = (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
  };

  /**
   * Resolves a program ID into a human-readable string (Code + Name).
   */
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

  // --- MAIN FORM RENDER ---
  return (
    <div className="apply-page">
      {/* Hero Header */}
      <div className="apply-hero">
        <div className="hero-badge">
          <GraduationCap size={14} />
          A.Y. 2026–2027 Enrollment
        </div>
        <h1>Richwell Colleges</h1>
        <p>Online Student Application Form</p>
      </div>

      {/* Visual Stepper Progress Bar */}
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

      {/* Main Form Scaffolding */}
      <div className="apply-form-container">
        <form onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" {...register('curriculum')} />

          {/* Render Step Components - Rule 7 & 12 Implementation */}
          {currentStep === 1 && (
            <PersonalInfoStep register={register} errors={errors} studentType={studentType} />
          )}

          {currentStep === 2 && (
            <ContactStep 
              register={register} 
              errors={errors} 
              locations={locations} 
              barangays={barangays}
              selectedMunicipality={selectedMunicipality}
              handlePhoneInput={handlePhoneInput}
            />
          )}

          {currentStep === 3 && (
            <AcademicStep register={register} errors={errors} programs={programs} curriculums={curriculums} />
          )}

          {currentStep === 4 && (
            <GuardianStep register={register} errors={errors} handlePhoneInput={handlePhoneInput} />
          )}

          {currentStep === 5 && (
            <ReviewStep values={values} getProgramName={getProgramName} />
          )}

          {/* Form Navigation Controls */}
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

export default PublicApplication;
