/**
 * StudentSearch Component
 * 
 * Reusable component for searching and selecting students.
 * Features:
 * - Search input with debounce support (handled by parent or internal logic)
 * - Result list rendering
 * - Selected state handling
 * - Empty state feedback
 */

import { BaseComponent, SIS } from '../../core/index.js';

export const renderStudentSearch = ({
    query = '',
    results = [],
    selectedId = null,
    loading = false,
    onSearch = 'searchStudent', // Global function name or handling
    onSelect = 'selectStudent', // Global function name
    placeholder = 'Search by student number or name...'
}) => {
    // Search Input Section
    const searchInputHtml = `
        <div class="flex gap-3">
            <div class="flex-1 relative">
                <input type="text" 
                       id="studentSearch"
                       value="${query}"
                       placeholder="${placeholder}"
                       class="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
            </div>
            <button onclick="${onSearch}()" class="btn-primary px-6" ${loading ? 'disabled' : ''}>
                ${loading ? 'Searching...' : 'Search'}
            </button>
        </div>
    `;

    // Results Section
    let resultsHtml = '';

    if (query && results.length === 0 && !loading) {
        resultsHtml = `
            <div class="mt-4 p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                No students found matching "${query}". Type at least 2 characters.
            </div>
        `;
    } else if (results.length > 0) {
        resultsHtml = `
            <div class="mt-4 space-y-2">
                ${results.map(student => `
                    <div onclick="${onSelect}('${student.id}')" 
                         class="p-4 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between ${selectedId === student.id ? 'ring-2 ring-blue-500' : ''}">
                        <div>
                            <p class="font-medium text-gray-800">${student.first_name} ${student.last_name}</p>
                            <p class="text-sm text-gray-500">${student.student_number} • ${student.program?.code || 'N/A'} Year ${student.year_level || '-'}</p>
                        </div>
                        <span class="badge ${student.enrollment_status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}">${student.enrollment_status || 'UNKNOWN'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="card">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Select Student</h2>
            ${searchInputHtml}
            ${resultsHtml}
        </div>
    `;
};

// Also export as a render-ready object if needed for consistency
export const StudentSearch = {
    render: renderStudentSearch
};
