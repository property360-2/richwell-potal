/**
 * UI Component Library
 * Provides Atomic components for consistent design across modules
 */

export const UI = {
    /**
     * Standard Button
     */
    button({ label, onClick, type = 'primary', size = 'md', className = '', id = '' }) {
        const baseClasses = 'inline-flex items-center justify-center font-bold transition-all active:scale-[0.98] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed';
        const typeClasses = {
            primary: 'bg-blue-600 text-white hover:bg-blue-700',
            secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200',
            danger: 'bg-red-500 text-white hover:bg-red-600',
            outline: 'bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
            ghost: 'bg-transparent text-gray-500 hover:bg-gray-50'
        };
        const sizeClasses = {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-5 py-2.5 text-sm',
            lg: 'px-8 py-3.5 text-base'
        };

        const onClickAttr = onClick ? `onclick="${onClick}"` : '';
        const idAttr = id ? `id="${id}"` : '';

        return `
            <button ${idAttr} ${onClickAttr} class="${baseClasses} ${typeClasses[type]} ${sizeClasses[size]} ${className}">
                ${label}
            </button>
        `;
    },

    /**
     * Status Badge
     */
    badge(text, status = 'default') {
        const statuses = {
            default: 'bg-gray-100 text-gray-700',
            success: 'bg-green-100 text-green-700',
            warning: 'bg-yellow-100 text-yellow-700',
            info: 'bg-blue-100 text-blue-700',
            danger: 'bg-red-100 text-red-700'
        };
        return `<span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statuses[status] || statuses.default}">${text}</span>`;
    },

    /**
     * Standard Table Container
     */
    table({ headers, rows, className = '', sortBy = '', sortOrder = 'asc', onSort = '' }) {
        const renderHeader = (h) => {
            if (typeof h === 'string') return h;
            if (!h.sortable || !onSort) return h.label;

            const isCurrent = sortBy === h.key;
            const icon = isCurrent
                ? (sortOrder === 'asc' ? '↓' : '↑')
                : '⇅';

            return `
                <button onclick="${onSort}('${h.key}')" class="flex items-center gap-1 hover:text-blue-600 transition-colors">
                    ${h.label}
                    <span class="text-[8px] ${isCurrent ? 'text-blue-600' : 'text-gray-300'}">${icon}</span>
                </button>
            `;
        };

        return `
            <div class="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200 ${className}">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50/50">
                        <tr>
                            ${headers.map(h => `<th class="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">${renderHeader(h)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 bg-white">
                        ${rows.map(row => `
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                ${row.map(cell => `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${cell}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Card Container
     */
    card({ title, subtitle, content, actions = '', className = '' }) {
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        ${title ? `<h3 class="text-lg font-black text-gray-800">${title}</h3>` : ''}
                        ${subtitle ? `<p class="text-sm text-gray-500 font-medium">${subtitle}</p>` : ''}
                    </div>
                    <div class="flex gap-2">
                        ${actions}
                    </div>
                </div>
                <div>${content}</div>
            </div>
        `;
    },

    /**
     * Form Field
     */
    field({ label, id, type = 'text', value = '', placeholder = '', required = false, options = [], attrs = '' }) {
        let inputHtml = '';
        const commonClasses = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm outline-none';

        if (type === 'select') {
            inputHtml = `
                <select id="${id}" ${required ? 'required' : ''} ${attrs} class="${commonClasses}">
                    ${options.map(opt => `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                </select>
            `;
        } else if (type === 'textarea') {
            inputHtml = `<textarea id="${id}" placeholder="${placeholder}" ${required ? 'required' : ''} ${attrs} class="${commonClasses} min-h-[100px]">${value}</textarea>`;
        } else {
            inputHtml = `<input type="${type}" id="${id}" value="${value}" placeholder="${placeholder}" ${required ? 'required' : ''} ${attrs} class="${commonClasses}">`;
        }

        return `
            <div class="space-y-1.5 container-${id}">
                <label for="${id}" class="block text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">${label}</label>
                ${inputHtml}
            </div>
        `;
    }
};
