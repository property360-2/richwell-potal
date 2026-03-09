import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar as CalendarIcon, 
  GraduationCap, 
  ShieldCheck,
  Send,
  CheckCircle2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { academicsApi } from '../api/academics';
import { studentsApi } from '../api/students';

const PublicApplication = () => {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      student_type: 'FRESHMAN',
      gender: 'MALE'
    }
  });
  const { showToast } = useToast();

  // SEO & Head Management
  useEffect(() => {
    document.title = "Apply Now: Richwell Colleges 2026 Online Enrollment | Admission";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Secure your future at Richwell Colleges. Apply online for Academic Year 2026-2027. Fast, easy enrollment for Freshmen & Transferees. Join us today ✓");
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Secure your future at Richwell Colleges. Apply online for Academic Year 2026-2027. Fast, easy enrollment for Freshmen & Transferees. Join us today ✓";
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
  }, []);
  const [programs, setPrograms] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [locations, setLocations] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const selectedProgramId = watch('program');
  const selectedMunicipality = watch('address_municipality');

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
        showToast('error', 'Failed to load application data');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      const fetchCurriculums = async () => {
        try {
          const res = await academicsApi.getCurriculums({ program: selectedProgramId, is_active: true });
          const currs = res.data.results || res.data;
          setCurriculums(currs);
          
          // Auto-pick the first (latest) curriculum
          if (currs && currs.length > 0) {
            setValue('curriculum', currs[0].id);
          }
        } catch (err) {
          showToast('error', 'Failed to load curriculums');
        }
      };
      fetchCurriculums();
    }
  }, [selectedProgramId]);

  useEffect(() => {
    if (selectedMunicipality && locations) {
      setBarangays(locations[selectedMunicipality] || []);
    }
  }, [selectedMunicipality, locations]);

  const onSubmit = async (data) => {
    try {
      await studentsApi.apply(data);
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Application Error:', err.response?.data);
      const errors = err.response?.data;
      if (errors && typeof errors === 'object' && !errors.error) {
        // Handle field-specific validation errors from DRF
        const fieldErrors = Object.entries(errors).map(([key, value]) => `${key}: ${value}`).join(', ');
        showToast('error', `Validation Error: ${fieldErrors}`);
      } else {
        showToast('error', err.response?.data?.error || 'Failed to submit application');
      }
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-8">
          <div className="inline-flex items-center justify-center p-4 bg-green-50 text-green-600 rounded-full mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Application Submitted!</h1>
          <p className="text-slate-600 mb-8">
            Thank you for applying to Richwell Colleges. Please wait for an email with your appointment date for document verification.
          </p>
          <Button variant="primary" className="w-full" onClick={() => window.location.reload()}>
            Submit Another Application
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-800">Student Application Form</h1>
          <p className="text-slate-600 mt-2">Join our academic community. Please fill out the form below accurately.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal Information */}
          <Section title="Personal Information" icon={<User size={20} />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="First Name" {...register('first_name', { required: 'First name is required' })} error={errors.first_name?.message} />
              <Input label="Middle Name (Optional)" {...register('middle_name')} />
              <Input label="Last Name" {...register('last_name', { required: 'Last name is required' })} error={errors.last_name?.message} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <Input label="Date of Birth" type="date" {...register('date_of_birth', { required: true })} error={errors.date_of_birth && 'Required'} />
              <Select 
                label="Gender" 
                {...register('gender', { required: true })} 
                options={[
                  { value: 'MALE', label: 'Male' },
                  { value: 'FEMALE', label: 'Female' },
                  { value: 'OTHER', label: 'Other' }
                ]}
              />
              <Select 
                label="Student Type" 
                {...register('student_type', { required: true })} 
                options={[
                  { value: 'FRESHMAN', label: 'Freshman' },
                  { value: 'TRANSFEREE', label: 'Transferee' }
                ]}
              />
            </div>

            {watch('student_type') === 'TRANSFEREE' && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <Input 
                  label="Past School / University" 
                  placeholder="e.g., Bulacan State University"
                  icon={<GraduationCap size={16} />}
                  {...register('previous_school', { required: 'Past school is required for transferees' })} 
                  error={errors.previous_school?.message} 
                />
              </div>
            )}
          </Section>


          {/* Contact Details */}
          <Section title="Contact & Address" icon={<Mail size={20} />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Email Address" 
                type="email" 
                icon={<Mail size={16} />} 
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                })} 
                error={errors.email?.message} 
              />
              <Input 
                label="Contact Number" 
                icon={<Phone size={16} />} 
                {...register('contact_number', { 
                  required: 'Contact number is required',
                  pattern: {
                    value: /^(09|\+639)\d{9}$/,
                    message: "Enter a valid PH mobile number"
                  }
                })} 
                error={errors.contact_number?.message} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Select 
                label="Municipality (Bulacan Only)" 
                placeholder="Select Municipality"
                icon={<MapPin size={16} />}
                {...register('address_municipality', { required: true })} 
                options={locations ? Object.keys(locations).map(name => ({ value: name, label: name })) : []}
                error={errors.address_municipality && 'Required'}
              />
              <Select 
                label="Barangay" 
                placeholder="Select Barangay"
                {...register('address_barangay', { required: true })} 
                options={barangays.map(b => ({ value: b, label: b }))}
                disabled={!selectedMunicipality}
                error={errors.address_barangay && 'Required'}
              />
            </div>
            <div className="mt-6">
              <Input label="Full Address Details (Street, House No.)" {...register('address_full')} />
            </div>
          </Section>

          {/* Academic Preference */}
          <Section title="Academic Preference" icon={<GraduationCap size={20} />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select 
                label="Preferred Program" 
                placeholder="Select Program"
                {...register('program', { required: true })} 
                options={programs.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                error={errors.program && 'Required'}
              />
              {/* Curriculum is auto-picked behind the scenes */}
              <input type="hidden" {...register('curriculum')} />
            </div>
          </Section>

          {/* Guardian Information */}
          <Section title="Guardian Information" icon={<ShieldCheck size={20} />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Guardian / Parent Name" {...register('guardian_name', { required: true })} error={errors.guardian_name && 'Required'} />
              <Input label="Guardian Contact Number" icon={<Phone size={16} />} {...register('guardian_contact', { required: true })} error={errors.guardian_contact && 'Required'} />
            </div>
          </Section>

          <Card className="bg-primary/5 border-primary/20 p-6">
            <div className="flex items-start gap-4">
               <div className="p-2 bg-primary text-white rounded-lg">
                  <Send size={24} />
               </div>
               <div>
                  <h3 className="font-bold text-slate-800">Final Review</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    By submitting this application, I certify that all information provided is true and correct. 
                    I understand that any false information may be grounds for rejection.
                  </p>
                  <Button variant="primary" type="submit" className="mt-6 px-12" loading={isSubmitting}>
                    Submit Application
                  </Button>
               </div>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
};

const Section = ({ title, icon, children }) => (
  <Card className="overflow-visible">
    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
      <div className="text-primary">{icon}</div>
      <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
    </div>
    {children}
  </Card>
);

export default PublicApplication;
