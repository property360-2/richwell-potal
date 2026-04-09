/**
 * frontend/src/components/ui/DateSelector.jsx
 * 
 * A reusable component that provides three select fields for Month, Day, and Year.
 * Designed to work seamlessly with react-hook-form.
 */

import React from 'react';
import Select from './Select';

/**
 * DateSelector Component
 * 
 * @param {Object} props
 * @param {Function} props.register - React Hook Form's register function.
 * @param {Object} props.errors - React Hook Form's current error state.
 * @param {string} [props.label] - Optional label for the group.
 * @param {string} [props.monthField="birth_month"] - Field name for the month.
 * @param {string} [props.dayField="birth_day"] - Field name for the day.
 * @param {string} [props.yearField="birth_year"] - Field name for the year.
 * @param {string} [props.required=true] - Whether the fields are required.
 */
const DateSelector = ({ 
  register, 
  errors, 
  label = "Date of Birth",
  monthField = "birth_month",
  dayField = "birth_day",
  yearField = "birth_year",
  required = true,
  className = ""
}) => {
  const monthOptions = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const dayOptions = Array.from({ length: 31 }, (_, i) => ({ 
    value: String(i + 1).padStart(2, '0'), 
    label: String(i + 1) 
  }));

  const yearOptions = Array.from({ length: 100 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: String(year), label: String(year) };
  });

  const validation = required ? { required: 'Required' } : {};

  return (
    <div className={`form-row ${className}`}>
      {label && <label className="input-label mb-2 block">{label}</label>}
      <div className="grid grid-cols-3 gap-3">
        <Select 
          placeholder="Month"
          {...register(monthField, validation)}
          options={monthOptions}
          error={errors[monthField]?.message}
          onChange={(e) => {
            const { onChange } = register(monthField, validation);
            onChange(e); // Trigger RHF change
          }}
        />
        <Select 
          placeholder="Day"
          {...register(dayField, validation)}
          options={dayOptions}
          error={errors[dayField]?.message}
          onChange={(e) => {
            const { onChange } = register(dayField, validation);
            onChange(e); // Trigger RHF change
          }}
        />
        <Select 
          placeholder="Year"
          {...register(yearField, validation)}
          options={yearOptions}
          error={errors[yearField]?.message}
          onChange={(e) => {
            const { onChange } = register(yearField, validation);
            onChange(e); // Trigger RHF change
          }}
        />
      </div>
    </div>
  );
};

export default DateSelector;
