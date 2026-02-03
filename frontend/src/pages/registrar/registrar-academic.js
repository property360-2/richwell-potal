import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth, debounce, getSubjectColor, formatTime, setButtonLoading } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';
import { createTabs, updateHash } from '../../components/tabs.js';

// Import Modules
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

  // Search/Filter states
  programSearchQuery: '',
  professorSearch: '',
  roomSearch: '',
  sectionSearch: '',
  semesterSearch: '',
  sectionFilterProgram: 'all',
  sectionFilterYear: 'all',

  // Shared states for modules
  profSubjectState: { selected: [], results: [], search: '' },
  selectedSection: null,
  detailedSubjects: [],
  sectionSchedule: [],
};

const ctx = {
  state,
  service: AcademicService,
  render: () => render(),
  loadPrograms: async () => { state.programs = await AcademicService.loadPrograms(); },
  loadProfessors: async () => { state.professors = await AcademicService.loadProfessors(); },
  loadRooms: async () => { state.rooms = await AcademicService.loadRooms(); },
  loadSections: async () => { state.sections = await AcademicService.loadSections({ semester: state.activeSemester?.id }); },
  loadSemesters: async () => {
    state.semesters = await AcademicService.loadSemesters();
    state.activeSemester = state.semesters.find(s => s.is_active);
  }
};

async function init() {
  if (!requireAuth()) return;

  // Load initial data
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

    // Init Modules
    ProgramsModule.init(ctx);
    ProfessorsModule.init(ctx);
    RoomsModule.init(ctx);
    SectionsModule.init(ctx);
    SemestersModule.init(ctx);

    const hash = window.location.hash.slice(1);
    if (hash && Object.values(TABS).includes(hash)) {
      state.activeTab = hash;
    }

    state.loading = false;
    render();
  } catch (e) {
    ErrorHandler.handle(e, 'Initializing');
  }

  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.slice(1);
    if (newHash && Object.values(TABS).includes(newHash)) {
      switchTab(newHash);
    }
  });
}

window.switchTab = function (tabId) {
  state.activeTab = tabId;
  state.subView = 'list';
  updateHash(tabId);

  // Load tab-specific data
  if (tabId === TABS.PROFESSORS) ctx.loadProfessors().then(() => render());
  else if (tabId === TABS.ROOMS) ctx.loadRooms().then(() => render());
  else if (tabId === TABS.SECTIONS) ctx.loadSections().then(() => render());
  else render();
};

function render() {
  const app = document.getElementById('app');
  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading academic structure...');
    return;
  }

  app.innerHTML = `
    ${createHeader({ role: 'REGISTRAR', activePage: 'registrar-academic', user: state.user })}
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Academic Structure</h1>
        <p class="text-gray-600 mt-1">Manage programs, subjects, sections, and faculty assignments</p>
      </div>

      ${createTabs({
    tabs: [
      { id: TABS.PROGRAMS, label: 'Programs' },
      { id: TABS.PROFESSORS, label: 'Professors' },
      { id: TABS.ROOMS, label: 'Rooms' },
      { id: TABS.SECTIONS, label: 'Sections' },
      { id: TABS.SEMESTERS, label: 'Semesters' }
    ],
    activeTab: state.activeTab,
    onTabChange: 'switchTab'
  })}

      <div class="mt-8">
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
    case TABS.SECTIONS: return state.subView === 'detail' ? SectionsModule.renderSectionDetail ? SectionsModule.renderSectionDetail() : 'Detail view not yet implemented in module' : SectionsModule.renderSectionsTab();
    case TABS.SEMESTERS: return SemestersModule.renderSemestersTab();
    default: return ProgramsModule.renderProgramsTab();
  }
}

// Global helpers that might be needed by modules (if not already handled)
window.debounce = debounce;
window.getSubjectColor = getSubjectColor;
window.formatTime = formatTime;
window.setButtonLoading = setButtonLoading;

init();
