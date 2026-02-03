/**
 * Validation Utility
 * Consistent validation logic for forms across the application
 */

export const Validator = {
    /**
     * Required field check
     */
    required(value) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            return 'This field is required';
        }
        return null;
    },

    /**
     * Email format check
     */
    email(value) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !re.test(value)) {
            return 'Invalid email address';
        }
        return null;
    },

    /**
     * Minimum length check
     */
    minLength(len) {
        return (value) => {
            if (value && value.length < len) {
                return `Must be at least ${len} characters`;
            }
            return null;
        };
    },

    /**
     * Validate an entire form object
     * @param {Object} data - Key-value pairs of form data
     * @param {Object} rules - Rules mapping (e.g., { email: [Validator.required, Validator.email] })
     */
    validate(data, rules) {
        const errors = {};
        let isValid = true;

        for (const field in rules) {
            const fieldRules = Array.isArray(rules[field]) ? rules[field] : [rules[field]];
            for (const rule of fieldRules) {
                const error = rule(data[field]);
                if (error) {
                    errors[field] = error;
                    isValid = false;
                    break;
                }
            }
        }

        return { isValid, errors };
    }
};
