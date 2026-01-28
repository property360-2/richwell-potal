/**
 * Input Atoms
 * 
 * Reusable form input components.
 * Pure presentational with validation display support.
 * 
 * Usage:
 *   import { renderTextInput, renderSelectInput, renderSearchInput } from './atoms/inputs/Input.js';
 *   
 *   const html = renderTextInput({ name: 'email', placeholder: 'Enter email' });
 */

import { BaseComponent, SIS } from '../../core/index.js';

/**
 * Render text input HTML
 * @param {Object} options - Input options
 * @returns {string} HTML string
 */
export function renderTextInput({
    name = '',
    id = '',
    type = 'text',
    value = '',
    placeholder = '',
    label = '',
    error = '',
    required = false,
    disabled = false,
    readonly = false,
    className = '',
    inputClassName = '',
    autoComplete = '',
    minLength = null,
    maxLength = null,
    pattern = null,
    hint = ''
}) {
    const inputId = id || name;
    const hasError = !!error;

    const baseInputClass = 'w-full px-4 py-2.5 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2';
    const normalClass = 'border-gray-200 focus:ring-blue-500 focus:border-blue-500';
    const errorClass = 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50';

    return `
    <div class="form-field ${className}">
      ${label ? `
        <label for="${inputId}" class="block text-sm font-medium text-gray-700 mb-1.5">
          ${label}
          ${required ? '<span class="text-red-500 ml-0.5">*</span>' : ''}
        </label>
      ` : ''}
      <input
        type="${type}"
        ${name ? `name="${name}"` : ''}
        id="${inputId}"
        value="${escapeAttr(value)}"
        placeholder="${escapeAttr(placeholder)}"
        class="${baseInputClass} ${hasError ? errorClass : normalClass} ${inputClassName}"
        ${required ? 'required' : ''}
        ${disabled ? 'disabled' : ''}
        ${readonly ? 'readonly' : ''}
        ${autoComplete ? `autocomplete="${autoComplete}"` : ''}
        ${minLength !== null ? `minlength="${minLength}"` : ''}
        ${maxLength !== null ? `maxlength="${maxLength}"` : ''}
        ${pattern ? `pattern="${pattern}"` : ''}
        ${hasError ? 'aria-invalid="true"' : ''}
        ${hasError ? `aria-describedby="${inputId}-error"` : ''}
      >
      ${hint && !hasError ? `<p class="mt-1 text-xs text-gray-500">${hint}</p>` : ''}
      ${hasError ? `<p id="${inputId}-error" class="mt-1 text-xs text-red-600">${error}</p>` : ''}
    </div>
  `.trim();
}

/**
 * Render select input HTML
 * @param {Object} options - Select options
 * @returns {string} HTML string
 */
export function renderSelectInput({
    name = '',
    id = '',
    value = '',
    options = [], // [{ value, label, disabled }] or ['value1', 'value2']
    placeholder = 'Select...',
    label = '',
    error = '',
    required = false,
    disabled = false,
    className = '',
    selectClassName = '',
    emptyOption = true
}) {
    const inputId = id || name;
    const hasError = !!error;

    const baseSelectClass = 'w-full px-4 py-2.5 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 appearance-none bg-white';
    const normalClass = 'border-gray-200 focus:ring-blue-500 focus:border-blue-500';
    const errorClass = 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50';

    // Normalize options
    const normalizedOptions = options.map(opt => {
        if (typeof opt === 'string' || typeof opt === 'number') {
            return { value: opt, label: opt };
        }
        return opt;
    });

    return `
    <div class="form-field ${className}">
      ${label ? `
        <label for="${inputId}" class="block text-sm font-medium text-gray-700 mb-1.5">
          ${label}
          ${required ? '<span class="text-red-500 ml-0.5">*</span>' : ''}
        </label>
      ` : ''}
      <div class="relative">
        <select
          ${name ? `name="${name}"` : ''}
          id="${inputId}"
          class="${baseSelectClass} ${hasError ? errorClass : normalClass} ${selectClassName}"
          ${required ? 'required' : ''}
          ${disabled ? 'disabled' : ''}
          ${hasError ? 'aria-invalid="true"' : ''}
        >
          ${emptyOption ? `<option value="">${placeholder}</option>` : ''}
          ${normalizedOptions.map(opt => `
            <option 
              value="${escapeAttr(opt.value)}" 
              ${String(opt.value) === String(value) ? 'selected' : ''}
              ${opt.disabled ? 'disabled' : ''}
            >${opt.label}</option>
          `).join('')}
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </div>
      ${hasError ? `<p id="${inputId}-error" class="mt-1 text-xs text-red-600">${error}</p>` : ''}
    </div>
  `.trim();
}

/**
 * Render search input with icon
 * @param {Object} options - Search input options
 * @returns {string} HTML string
 */
export function renderSearchInput({
    name = 'search',
    id = '',
    value = '',
    placeholder = 'Search...',
    className = '',
    inputClassName = '',
    onInput = '',
    onChange = ''
}) {
    const inputId = id || name;

    return `
    <div class="relative ${className}">
      <input
        type="text"
        ${name ? `name="${name}"` : ''}
        id="${inputId}"
        value="${escapeAttr(value)}"
        placeholder="${escapeAttr(placeholder)}"
        class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputClassName}"
        ${onInput ? `oninput="${onInput}"` : ''}
        ${onChange ? `onchange="${onChange}"` : ''}
      >
      <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
    </div>
  `.trim();
}

/**
 * Render checkbox input
 * @param {Object} options - Checkbox options
 * @returns {string} HTML string
 */
export function renderCheckbox({
    name = '',
    id = '',
    checked = false,
    value = 'true',
    label = '',
    disabled = false,
    className = ''
}) {
    const inputId = id || name;

    return `
    <label class="inline-flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}">
      <input
        type="checkbox"
        ${name ? `name="${name}"` : ''}
        id="${inputId}"
        value="${escapeAttr(value)}"
        ${checked ? 'checked' : ''}
        ${disabled ? 'disabled' : ''}
        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      >
      ${label ? `<span class="text-sm text-gray-700">${label}</span>` : ''}
    </label>
  `.trim();
}

/**
 * Render textarea
 * @param {Object} options - Textarea options
 * @returns {string} HTML string
 */
export function renderTextarea({
    name = '',
    id = '',
    value = '',
    placeholder = '',
    label = '',
    error = '',
    required = false,
    disabled = false,
    rows = 4,
    className = '',
    textareaClassName = ''
}) {
    const inputId = id || name;
    const hasError = !!error;

    const baseClass = 'w-full px-4 py-2.5 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 resize-y';
    const normalClass = 'border-gray-200 focus:ring-blue-500 focus:border-blue-500';
    const errorClass = 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50';

    return `
    <div class="form-field ${className}">
      ${label ? `
        <label for="${inputId}" class="block text-sm font-medium text-gray-700 mb-1.5">
          ${label}
          ${required ? '<span class="text-red-500 ml-0.5">*</span>' : ''}
        </label>
      ` : ''}
      <textarea
        ${name ? `name="${name}"` : ''}
        id="${inputId}"
        placeholder="${escapeAttr(placeholder)}"
        rows="${rows}"
        class="${baseClass} ${hasError ? errorClass : normalClass} ${textareaClassName}"
        ${required ? 'required' : ''}
        ${disabled ? 'disabled' : ''}
        ${hasError ? 'aria-invalid="true"' : ''}
      >${escapeHtml(value)}</textarea>
      ${hasError ? `<p id="${inputId}-error" class="mt-1 text-xs text-red-600">${error}</p>` : ''}
    </div>
  `.trim();
}

// Helper functions
function escapeAttr(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * TextInput Component Class
 */
export class TextInput extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        this.el.innerHTML = renderTextInput(this.props);
        this.attachListeners();
    }

    attachListeners() {
        const input = this.$('input');
        if (input) {
            this.on(input, 'input', (e) => this.emit('input', { value: e.target.value }));
            this.on(input, 'change', (e) => this.emit('change', { value: e.target.value }));
        }
    }

    getValue() {
        return this.$('input')?.value || '';
    }

    setValue(value) {
        const input = this.$('input');
        if (input) input.value = value;
    }

    setError(error) {
        this.props.error = error;
        this.render();
    }
}

/**
 * SelectInput Component Class
 */
export class SelectInput extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        this.el.innerHTML = renderSelectInput(this.props);
        this.attachListeners();
    }

    attachListeners() {
        const select = this.$('select');
        if (select) {
            this.on(select, 'change', (e) => this.emit('change', { value: e.target.value }));
        }
    }

    getValue() {
        return this.$('select')?.value || '';
    }

    setValue(value) {
        const select = this.$('select');
        if (select) select.value = value;
    }
}

// Register with SIS
SIS.register('TextInput', TextInput);
SIS.register('SelectInput', SelectInput);

export default { renderTextInput, renderSelectInput, renderSearchInput, renderCheckbox, renderTextarea };
