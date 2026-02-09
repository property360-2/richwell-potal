import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';
import { createTabs, updateHash } from '../../components/tabs.js';
import { renderScheduleGrid } from '../../organisms/tables/ScheduleGrid.js';


// Import Refactored Modules
import { AcademicService } from './AcademicService.js';
import { ProgramsModule } from './modules/ProgramsModule.js';
import { ProfessorsModule } from './modules/ProfessorsModule.js';
import { RoomsModule } from './modules/RoomsModule.js';
import { SectionsModule } from './modules/SectionsModule.js';
import { SemestersModule } from './modules/SemestersModule.js';

const TABS = {
  PROGRAMS: 'programs',
  PROFESSORS: 'professors',
  ROOMS: 'rooms',
  SECTIONS: 'sections',
  SEMESTERS: 'semesters'
};

// Application State
const state = {
  user: null,
  loading: true,
  activeTab: TABS.PROGRAMS,
  subView: 'list',
  programs: [],
  professors: [],
  rooms: [],
  sections: [],
  semesters: [],
  activeSemester: null,
  activeProgramCurricula: [],
  activeProgramSubjects: [],

  // UI Filters
  programSearchQuery: '',
  professorSearch: '',
  roomSearch: '',
  sectionSearch: '',
  semesterSearch: '',
  sectionFilterProgram: 'all',
  sectionFilterYear: 'all',
  sectionSortBy: 'name',
  sectionSortOrder: 'asc',

  // Shared states for modules
  profSubjectState: { selected: [] },
  profProgramState: { selected: [] },
  programDetailTab: 'subjects',
  programSubjectSearch: '',
  programSubjectSortBy: 'code',
  programSubjectSortOrder: 'asc',
  selectedSection: null,
  detailedSubjects: [],
  sectionSchedule: [],
};

// Context Object passed to modules
const ctx = {
  state,
  service: AcademicService,
  api,
  endpoints,
  render: () => render(),
  renderRoomScheduleGrid: (slots) => renderScheduleGrid({ slots, emptyMessage: 'Facility is free for the entire week' }),
  loadPrograms: async () => { state.programs = await AcademicService.loadPrograms(); },
  loadProfessors: async (search) => { state.professors = await AcademicService.loadProfessors(search); },
  loadRooms: async () => { state.rooms = await AcademicService.loadRooms(); },
  loadSections: async () => {
    if (!state.activeSemester) {
      console.warn('No active semester selected for section loading');
      state.sections = [];
      return;
    }
    const params = {
      semester: state.activeSemester.id,
      search: state.sectionSearch || '',
      year_level: state.sectionFilterYear === 'all' ? '' : state.sectionFilterYear,
      program: state.sectionFilterProgram === 'all' ? '' : state.sectionFilterProgram,
      ordering: state.sectionSortOrder === 'desc' ? `-${state.sectionSortBy}` : state.sectionSortBy
    };
    state.sections = await AcademicService.loadSections(params);
  },
  loadSemesters: async () => {
    state.semesters = await AcademicService.loadSemesters();
    state.activeSemester = state.semesters.find(s => s.is_active) || state.semesters[0];
  },
  loadCurricula: async (programId) => { state.activeProgramCurricula = await AcademicService.loadCurricula(programId); },
  loadSubjects: async (programId) => {
    state.activeProgramSubjects = await AcademicService.loadSubjects({
      program: programId,
      search: state.programSubjectSearch || '',
      ordering: state.programSubjectSortOrder === 'desc' ? `-${state.programSubjectSortBy}` : state.programSubjectSortBy
    });
  }
};

async function init() {
  if (!requireAuth()) return;

  state.loading = true;
  render();

  try {
    const user = await api.get(endpoints.me);
    state.user = user;
    TokenManager.setUser(user);

    await Promise.all([
      ctx.loadPrograms(),
      ctx.loadSemesters()
    ]);

    // Initial load for first tab
    await ctx.loadPrograms();

    // Initialize Modules
    ProgramsModule.init(ctx);
    ProfessorsModule.init(ctx);
    RoomsModule.init(ctx);
    SectionsModule.init(ctx);
    SemestersModule.init(ctx);

    const hash = window.location.hash.slice(1);
    if (hash && Object.values(TABS).includes(hash)) {
      state.activeTab = hash;
      await switchTab(hash);
    }

    state.loading = false;
    render();
  } catch (e) {
    ErrorHandler.handle(e, 'Initializing Academic Portal');
  }

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (hash && Object.values(TABS).includes(hash) && hash !== state.activeTab) {
      switchTab(hash);
    }
  });
}

window.switchTab = async function (tabId) {
  state.activeTab = tabId;
  state.subView = 'list';
  updateHash(tabId);

  // Tab-specific lazy loading
  try {
    if (tabId === TABS.PROFESSORS) await ctx.loadProfessors();
    else if (tabId === TABS.ROOMS) await ctx.loadRooms();
    else if (tabId === TABS.SECTIONS) {
      await Promise.all([
        ctx.loadSections(),
        ctx.loadRooms(),
        ctx.loadProfessors()
      ]);
    }
    else if (tabId === TABS.PROGRAMS) await ctx.loadPrograms();
  } catch (e) {
    ErrorHandler.handle(e);
  }

  render();
};

window.switchSemester = async function (id) {
  state.activeSemester = state.semesters.find(s => s.id === id);
  if (state.activeTab === TABS.SECTIONS) {
    state.loading = true;
    render();
    await ctx.loadSections();
    state.loading = false;
  }
  render();
};

function render() {
  const app = document.getElementById('app');
  if (state.loading) {
    app.innerHTML = LoadingOverlay('Assembling academic data...');
    return;
  }

  app.innerHTML = `
    ${createHeader({ role: 'REGISTRAR', activePage: 'registrar-academic', user: state.user })}
    <main class="max-w-7xl mx-auto px-4 py-12">
      <header class="mb-10">
        <div class="flex items-center gap-3 mb-2">
            <span class="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Registrar</span>
            <select onchange="switchSemester(this.value)" class="bg-transparent text-sm text-gray-500 font-black tracking-tight border-none outline-none focus:ring-0 cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-all">
                ${state.semesters.map(s => `
                    <option value="${s.id}" ${state.activeSemester?.id === s.id ? 'selected' : ''} class="text-gray-900">${s.name}</option>
                `).join('')}
            </select>
        </div>
        <h1 class="text-4xl font-black text-gray-900 tracking-tight">Academic Structure</h1>
        <p class="text-gray-500 font-medium mt-2">Centralized management for programs, faculty, facilities, and class sections.</p>
      </header>

      ${createTabs({
    tabs: [
      { id: TABS.PROGRAMS, label: 'Programs' },
      { id: TABS.PROFESSORS, label: 'Faculty' },
      { id: TABS.ROOMS, label: 'Facilities' },
      { id: TABS.SECTIONS, label: 'Sections' },
      { id: TABS.SEMESTERS, label: 'Calendar' }
    ],
    activeTab: state.activeTab,
    onTabChange: 'switchTab'
  })}

      <div class="mt-10 animate-in fade-in duration-500 slide-in-from-bottom-2">
        ${renderTabContent()}
      </div>
    </main>
  `;
}

function renderTabContent() {
  switch (state.activeTab) {
    case TABS.PROGRAMS: return ProgramsModule.renderProgramsTab();
    case TABS.PROFESSORS: return ProfessorsModule.renderProfessorsTab();
    case TABS.ROOMS: return RoomsModule.renderRoomsTab();
    case TABS.SECTIONS: return SectionsModule.renderSectionsTab();
    case TABS.SEMESTERS: return SemestersModule.renderSemestersTab();
    default: return ProgramsModule.renderProgramsTab();
  }
}

init();
