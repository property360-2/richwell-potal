/**
 * FormField Molecule
 * 
 * Combines label, input, and error message into a cohesive form field.
 * Provides consistent styling and validation feedback.
 * 
 * Usage:
 *   import { renderFormField } from './molecules/forms/FormField.js';
 */

import { BaseComponent, SIS } from '../../core/index.js';
import { renderTextInput, renderSelectInput, renderTextarea, renderCheckbox } from '../../atoms/index.js';

/**
 * Render form field with label, input, and optional validation
 * @param {Object} options - Field options
 * @returns {string} HTML string
 */
export function renderFormField({
    type = 'text',       // text, email, password, number, select, textarea, checkbox
    name = '',
    id = '',
    label = '',
    value = '',
    placeholder = '',
    required = false,
    disabled = false,
    error = '',
    hint = '',
    options = [],        // For select type
    rows = 4,            // For textarea
    className = '',
    inputClassName = '',
    ...rest
}) {
    const inputId = id || name;

    // Route to appropriate atom based on type
    switch (type) {
        case 'select':
            return renderSelectInput({
                name,
                id: inputId,
                value,
                options,
                label,
                error,
                required,
                disabled,
                className,
                selectClassName: inputClassName,
                ...rest
            });

        case 'textarea':
            return renderTextarea({
                name,
                id: inputId,
                value,
                placeholder,
                label,
                error,
                required,
                disabled,
                rows,
                className,
                textareaClassName: inputClassName,
                ...rest
            });

        case 'checkbox':
            return `
        <div class="form-field ${className}">
          ${renderCheckbox({ name, id: inputId, checked: value, label, disabled, ...rest })}
          ${error ? `<p class="mt-1 text-xs text-red-600">${error}</p>` : ''}
        </div>
      `.trim();

        default:
            return renderTextInput({
                type,
                name,
                id: inputId,
                value,
                placeholder,
                label,
                error,
                required,
                disabled,
                hint,
                className,
                inputClassName,
                ...rest
            });
    }
}

/**
 * Render a form row with multiple fields
 * @param {Array} fields - Array of field configs
 * @param {Object} options - Row options
 * @returns {string} HTML string
 */
export function renderFormRow(fields, { className = '', gap = 4 } = {}) {
    return `
    <div class="grid grid-cols-1 md:grid-cols-${fields.length} gap-${gap} ${className}">
      ${fields.map(field => renderFormField(field)).join('')}
    </div>
  `.trim();
}

/**
 * Render form section with heading
 * @param {Object} options - Section options
 * @returns {string} HTML string
 */
export function renderFormSection({
    title = '',
    description = '',
    children = '',
    className = ''
}) {
    return `
    <div class="form-section ${className}">
      ${title ? `
        <div class="mb-4">
          <h3 class="text-lg font-semibold text-gray-800">${title}</h3>
          ${description ? `<p class="text-sm text-gray-500 mt-1">${description}</p>` : ''}
        </div>
      ` : ''}
      <div class="space-y-4">
        ${children}
      </div>
    </div>
  `.trim();
}

/**
 * FormField Component Class
 */
export class FormField extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        this.el.innerHTML = renderFormField(this.props);
        this.attachListeners();
    }

    attachListeners() {
        const input = this.$('input, select, textarea');
        if (input) {
            this.on(input, 'input', (e) => this.emit('input', { name: this.props.name, value: e.target.value }));
            this.on(input, 'change', (e) => this.emit('change', { name: this.props.name, value: e.target.value }));
            this.on(input, 'blur', (e) => this.emit('blur', { name: this.props.name, value: e.target.value }));
        }
    }

    getValue() {
        const input = this.$('input, select, textarea');
        if (!input) return null;
        if (input.type === 'checkbox') return input.checked;
        return input.value;
    }

    setValue(value) {
        const input = this.$('input, select, textarea');
        if (!input) return;
        if (input.type === 'checkbox') {
            input.checked = !!value;
        } else {
            input.value = value;
        }
    }

    setError(error) {
        this.props.error = error;
        this.render();
    }

    clearError() {
        this.setError('');
    }
}

// Register with SIS
SIS.register('FormField', FormField);

export default FormField;
