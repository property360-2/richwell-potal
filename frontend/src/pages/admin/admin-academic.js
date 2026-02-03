import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';
import { createTabs, updateHash } from '../../components/tabs.js';

// Import Services & Modules
import { AdminAcademicService } from './AdminAcademicService.js';
import { AdminProgramsModule } from './modules/AdminProgramsModule.js';
import { AdminSubjectsModule } from './modules/AdminSubjectsModule.js';
import { AdminCurriculaModule } from './modules/AdminCurriculaModule.js';
import { AdminSemestersModule } from './modules/AdminSemestersModule.js';

const TABS = {
  PROGRAMS: 'programs',
  SUBJECTS: 'subjects',
  CURRICULA: 'curricula',
  SEMESTERS: 'semesters'
};

const state = {
  user: null,
  loading: true,
  activeTab: TABS.PROGRAMS,
  programs: [],
  subjects: [],
  curricula: [],
  semesters: [],
  subjectFilterProgram: ''
};

const ctx = {
  state,
  service: AdminAcademicService,
  render: () => render(),
  loadPrograms: async () => { state.programs = await AdminAcademicService.loadPrograms(); },
  loadSubjects: async (pid) => { state.subjects = await AdminAcademicService.loadSubjects(pid); },
  loadCurricula: async () => { state.curricula = await AdminAcademicService.loadCurricula(); },
  loadSemesters: async () => { state.semesters = await AdminAcademicService.loadSemesters(); }
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
      ctx.loadSubjects(),
      ctx.loadCurricula(),
      ctx.loadSemesters()
    ]);

    // Init Modules
    AdminProgramsModule.init(ctx);
    AdminSubjectsModule.init(ctx);
    AdminCurriculaModule.init(ctx);
    AdminSemestersModule.init(ctx);

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
  updateHash(tabId);
  render();
};

function render() {
  const app = document.getElementById('app');
  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading administrative tools...');
    return;
  }

  app.innerHTML = `
    ${createHeader({ role: 'ADMIN', activePage: 'admin-academic', user: state.user })}
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Academic Administration</h1>
        <p class="text-gray-600 mt-1">Configure the core academic structure and rules</p>
      </div>

      ${createTabs({
    tabs: [
      { id: TABS.PROGRAMS, label: 'Programs' },
      { id: TABS.SUBJECTS, label: 'Subjects' },
      { id: TABS.CURRICULA, label: 'Curricula' },
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
    case TABS.PROGRAMS: return AdminProgramsModule.renderProgramsTab();
    case TABS.SUBJECTS: return AdminSubjectsModule.renderSubjectsTab();
    case TABS.CURRICULA: return AdminCurriculaModule.renderCurriculaTab();
    case TABS.SEMESTERS: return AdminSemestersModule.renderSemestersTab();
    default: return AdminProgramsModule.renderProgramsTab();
  }
}

init();
