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

const ContactStep = ({ 
  register, 
  errors, 
  locations, 
  barangays, 
  selectedMunicipality, 
  handlePhoneInput 
}) => {
  return (
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
  );
};

export default ContactStep;
