import { useState, useCallback } from 'react';

const useForm = (initialValues, validate) => {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        setValues(prev => ({ ...prev, [name]: val }));

        // Real-time validation if already touched
        if (touched[name]) {
            const validationErrors = validate({ ...values, [name]: val });
            setErrors(validationErrors);
        }
    }, [values, touched, validate]);

    // Custom setter for non-event values (like select or custom components)
    const setFieldValue = useCallback((name, value) => {
        setValues(prev => {
            const newValues = { ...prev, [name]: value };
            if (touched[name]) {
                const validationErrors = validate(newValues);
                setErrors(validationErrors);
            }
            return newValues;
        });
    }, [touched, validate]);

    const handleBlur = useCallback((e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        const validationErrors = validate(values);
        setErrors(validationErrors);
    }, [values, validate]);

    const handleSubmit = useCallback((onSubmit) => async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const validationErrors = validate(values);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length === 0) {
            try {
                await onSubmit(values);
            } catch (error) {
                // Handle submission error if needed, or let component handle it
                console.error("Form submission error", error);
            }
        }
        setIsSubmitting(false);
    }, [values, validate]);

    const resetForm = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
        setIsSubmitting(false);
    }, [initialValues]);

    return {
        values,
        errors,
        touched,
        isSubmitting,
        handleChange,
        handleBlur,
        handleSubmit,
        setFieldValue,
        resetForm,
        setValues // Expose for complex cases
    };
};

export default useForm;
