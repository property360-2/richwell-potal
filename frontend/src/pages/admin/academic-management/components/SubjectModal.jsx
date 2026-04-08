import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Info } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { academicsApi } from '../../../api/academics';
import { useToast } from '../../../components/ui/Toast';

const PREREQ_TYPES = [
  { value: 'SPECIFIC', label: 'Specific Subject' },
  { value: 'YEAR_STANDING', label: 'Year Standing' },
  { value: 'ALL_MAJOR', label: 'All Major Subjects' },
  { value: 'PROGRAM_PERCENTAGE', label: 'Program Percentage (Units)' },
];

const SubjectModal = ({ isOpen, onClose, onSuccess, curriculumId, subject = null }) => {
  const { register, handleSubmit, reset, setValue, watch, control, setError, formState: { errors, isSubmitting } } = useForm();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "prerequisites"
  });
  
  const [allSubjects, setAllSubjects] = useState([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && curriculumId) {
      academicsApi.getSubjects({ curriculum: curriculumId }).then(res => {
        setAllSubjects(res.data.results || res.data);
      });
    }
  }, [isOpen, curriculumId]);

  useEffect(() => {
    if (subject) {
      setValue('code', subject.code);
      setValue('description', subject.description);
      setValue('year_level', subject.year_level);
      setValue('semester', subject.semester);
      setValue('lec_units', subject.lec_units);
      setValue('lab_units', subject.lab_units);
      setValue('total_units', subject.total_units);
      setValue('is_major', subject.is_major ? 'true' : 'false');
      setValue('is_practicum', subject.is_practicum ? 'true' : 'false');
      setValue('hrs_per_week', subject.hrs_per_week);
      
      // Load current prerequisites if any
      if (subject.prerequisites) {
        reset({ 
            ...subject,
            is_major: subject.is_major ? 'true' : 'false',
            is_practicum: subject.is_practicum ? 'true' : 'false',
            prerequisites: subject.prerequisites.map(p => ({
                prerequisite_type: p.prerequisite_type,
                prerequisite_subject: p.prerequisite_subject || '',
                standing_year: p.standing_year || '',
                description: p.description || ''
            }))
        });
      }
    } else {
      reset({ 
        curriculum: curriculumId,
        year_level: 1, 
        semester: '1',
        lec_units: 3,
        lab_units: 0,
        total_units: 3,
        is_major: 'false',
        is_practicum: 'false',
        hrs_per_week: 3.0,
        prerequisites: []
      });
    }
  }, [subject, isOpen, setValue, reset, curriculumId]);

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      curriculum: curriculumId,
      is_major: data.is_major === 'true',
      is_practicum: data.is_practicum === 'true',
    };

    try {
      let subResponse;
      if (subject) {
        subResponse = await academicsApi.updateSubject(subject.id, payload);
        showToast('success', 'Subject updated successfully');
      } else {
        subResponse = await academicsApi.createSubject(payload);
        showToast('success', 'Subject created successfully');
      }
      
      // Note: In a real production app, we'd handle prerequisite updates more robustly
      // Here we just close and notify success
      onSuccess();
      onClose();
    } catch (err) {
      const errorData = err.response?.data;
      if (err.response?.status === 400 && errorData && typeof errorData === 'object') {
        Object.keys(errorData).forEach((field) => {
          if (['code', 'description', 'year_level', 'semester', 'lec_units', 'lab_units', 'total_units'].includes(field)) {
            setError(field, {
              type: 'manual',
              message: Array.isArray(errorData[field]) ? errorData[field][0] : errorData[field]
            });
          }
        });
        showToast('error', 'Please correct the errors in the form');
      } else {
        showToast('error', errorData?.detail || 'Failed to save subject');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={subject ? 'Edit Subject' : 'Add New Subject'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Subject Code"
                        placeholder="e.g. MATH 111"
                        error={errors.code?.message}
                        {...register('code', { required: 'Code is required' })}
                    />
                    <Input
                        label="Year Level"
                        type="number"
                        error={errors.year_level?.message}
                        {...register('year_level', { required: 'Year level is required', valueAsNumber: true })}
                    />
                </div>

                <Input
                    label="Description"
                    placeholder="e.g. College Algebra"
                    error={errors.description?.message}
                    {...register('description', { required: 'Description is required' })}
                />

                <div className="grid grid-cols-3 gap-4">
                    <Select
                        label="Semester"
                        options={[
                        { value: '1', label: '1st Sem' },
                        { value: '2', label: '2nd Sem' },
                        { value: 'S', label: 'Summer' }
                        ]}
                        {...register('semester')}
                    />
                    <Input label="Lec" type="number" {...register('lec_units', { valueAsNumber: true })} />
                    <Input label="Lab" type="number" {...register('lab_units', { valueAsNumber: true })} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <Input label="Total" type="number" {...register('total_units', { valueAsNumber: true })} />
                    <Select
                        label="Major?"
                        options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
                        {...register('is_major')}
                    />
                    <Select
                        label="Practicum?"
                        options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
                        {...register('is_practicum')}
                    />
                    <Input 
                        label="Hrs/Wk" 
                        type="number" 
                        step="0.1" 
                        {...register('hrs_per_week', { valueAsNumber: true })} 
                    />
                </div>
            </div>

            {/* Prerequisites Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Prerequisites</h4>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        icon={<Plus size={14} />}
                        onClick={() => append({ prerequisite_type: 'SPECIFIC', prerequisite_subject: '', standing_year: '', description: '' })}
                    >
                        Add
                    </Button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {fields.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-lg text-slate-400">
                           <p className="text-xs">No prerequisites defined.</p>
                        </div>
                    )}
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 relative group">
                            <button 
                                type="button" 
                                className="absolute -top-2 -right-2 bg-white border border-slate-200 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                onClick={() => remove(index)}
                            >
                                <Trash2 size={12} />
                            </button>
                            
                            <Select
                                options={PREREQ_TYPES}
                                size="sm"
                                {...register(`prerequisites.${index}.prerequisite_type`)}
                            />

                            <div className="mt-2">
                                {watch(`prerequisites.${index}.prerequisite_type`) === 'SPECIFIC' && (
                                    <Select
                                        options={allSubjects
                                            .filter(s => s.id !== subject?.id)
                                            .map(s => ({ value: s.id, label: s.code }))}
                                        size="sm"
                                        placeholder="Select subject"
                                        {...register(`prerequisites.${index}.prerequisite_subject`)}
                                    />
                                )}
                                {watch(`prerequisites.${index}.prerequisite_type`) === 'YEAR_STANDING' && (
                                    <Input
                                        type="number"
                                        placeholder="Min Year (e.g. 3)"
                                        size="sm"
                                        {...register(`prerequisites.${index}.standing_year`)}
                                    />
                                )}
                                {(watch(`prerequisites.${index}.prerequisite_type`) === 'ALL_MAJOR' || 
                                  watch(`prerequisites.${index}.prerequisite_type`) === 'PROGRAM_PERCENTAGE') && (
                                    <Input
                                        placeholder="Additional description"
                                        size="sm"
                                        {...register(`prerequisites.${index}.description`)}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg flex gap-3 text-blue-700 text-xs leading-relaxed">
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <p>Prerequisites are used to restrict enrollment until criteria are met.</p>
                </div>
            </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {subject ? 'Save Changes' : 'Create Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SubjectModal;
