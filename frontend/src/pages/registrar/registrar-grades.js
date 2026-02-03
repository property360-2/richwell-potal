import '../../../style.css';
import { api, endpoints } from '../../../api.js';
import { requireAuth } from '../../../utils.js';
import { createHeader } from '../../../components/header.js';
import { LoadingOverlay } from '../../../components/Spinner.js';

const state = {
    user: null,
    programs: [],
    loading: true
};

async function init() {
    if (!requireAuth()) return;

    // Load User
    try {
        const user = await api.get(endpoints.me);
        state.user = user;
    } catch (e) {
        console.error(e);
    }

    await loadPrograms();
    render();
}

async function loadPrograms() {
    try {
        const programs = await api.get(endpoints.academicPrograms);
        state.programs = (programs && programs.results) ? programs.results : (programs || []);
    } catch (error) {
        console.error('Error loading programs:', error);
    } finally {
        state.loading = false;
    }
}

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = LoadingOverlay('Loading Academic Programs...');
        return;
    }

    app.innerHTML = `
        ${createHeader({ role: 'REGISTRAR', activePage: 'grades', user: state.user })}
        
        <main class="max-w-7xl mx-auto px-4 py-8">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-800">Grade Monitoring</h1>
                <p class="text-gray-600 mt-2">Select an academic program to view submitted grades.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${state.programs.map(program => `
                    <a href="/registrar-grades-sections.html?program_id=${program.id}&program_name=${encodeURIComponent(program.code)}" 
                        class="block bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden group">
                        <div class="p-6">
                            <div class="flex items-start justify-between mb-4">
                                <div class="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                    <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                </div>
                                <span class="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                                    ${program.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 mb-2">${program.code}</h3>
                            <p class="text-sm text-gray-500 line-clamp-2 mb-4">${program.name}</p>
                            
                            <div class="flex items-center text-sm text-gray-500 pt-4 border-t border-gray-50">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                                </svg>
                                ${program.duration_years} Year Program
                            </div>
                        </div>
                    </a>
                `).join('')}
            </div>
        </main>
    `;
}

document.addEventListener('DOMContentLoaded', init);
