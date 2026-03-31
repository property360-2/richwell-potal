/**
 * ContactStep — Step 2 of the student application form.
 * 
 * This component renders fields for email, contact number, municipality, 
 * barangay, and full address. It dynamically filters barangays based on 
 * the selected municipality from Bulacan.
 * 
 * @param {Object} props - Component props.
 * @param {Function} props.register - React Hook Form's register function.
 * @param {Object} props.errors - React Hook Form's current error state.
 * @param {Object} props.locations - Bulacan location mapping.
 * @param {Array} props.barangays - Filtered barangays list.
 * @param {string} props.selectedMunicipality - Currently selected municipality.
 * @param {Function} props.handlePhoneInput - Sanitizer for phone input fields.
 * @returns {JSX.Element} The rendered step content.
 */

import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import { studentsApi } from '../../../../api/students';

const ContactStep = ({ 
  register, 
  errors, 
  locations, 
  barangays, 
  selectedMunicipality, 
  handlePhoneInput,
  watch
}) => {
  return (
    <div className="apply-step-card" key="step-2">
      <div className="step-header">
        <div className="step-header-icon"><Mail size={24} /></div>
        <div>
          <h2>Contact & Residence</h2>
          <p>How should we keep in touch with you?</p>
        </div>
      </div>

      <div className="form-grid-2">
        <Input 
          label="Email Address" 
          type="email" 
          placeholder="you@email.com"
          icon={<Mail size={18} className="text-primary/50" />} 
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Enter a valid email address"
            },
            validate: async (value) => {
              try {
                console.log(`Checking email: ${value}`);
                const res = await studentsApi.checkEmail(value);
                console.log(`Email check result:`, res.data);
                
                // If it exists, return the error message string (RHF treats strings as errors)
                if (res.data.exists) {
                  return "This email is already registered.";
                }
                
                // If it doesn't exist, return true (validation passed)
                return true;
              } catch (err) {
                console.error("Email API validation error:", err);
                // If the check crashes, we fallback to passing it for now
                return true; 
              }
            }
          })} 
          error={errors.email?.message} 
        />
        <Input 
          label="Contact Number" 
          placeholder="09XXXXXXXXX"
          icon={<Phone size={18} className="text-primary/50" />} 
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

      <div className="pt-6 border-t border-slate-50 mt-8">
        <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <MapPin size={14} className="text-primary" /> Permanent Address
        </h4>

        <div className="form-grid-2">
          <Select 
            label="Municipality" 
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
            label="Street / House Number / Landmark" 
            placeholder="e.g., 123 Rizal St. near Central Plaza"
            {...register('address_full', { required: 'Street address is required' })} 
            error={errors.address_full?.message}
          />
        </div>
      </div>
    </div>
  );
};

export default ContactStep;
