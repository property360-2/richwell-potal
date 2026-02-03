import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth, debounce } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';

// Import Services & Modules
import { AdmissionService } from './AdmissionService.js';
import { ApplicantModule } from './modules/ApplicantModule.js';
import { IdAssignmentModule } from './modules/IdAssignmentModule.js';

const state = {
  user: null,
  loading: true,
  applicants: [],
  searchQuery: '',
  statusFilter: 'all',
  activeTab: 'all'
};

const ctx = {
  state,
  service: AdmissionService,
  applicantModule: ApplicantModule,
  idModule: IdAssignmentModule,
  render: () => render(),
  loadApplicants: async () => { state.applicants = await AdmissionService.loadApplicants(); }
};

async function init() {
  if (!requireAuth()) return;

  state.loading = true;
  render();

  try {
    const user = await api.get(endpoints.me);
    state.user = user;
    TokenManager.setUser(user);

    await ctx.loadApplicants();

    // Init Modules
    ApplicantModule.init(ctx);
    IdAssignmentModule.init(ctx);

    state.loading = false;
    render();
  } catch (e) {
    ErrorHandler.handle(e, 'Initializing');
  }
}

window.handleSearch = debounce((q) => {
  state.searchQuery = q;
  render();
}, 300);

window.handleStatusFilter = (s) => {
  state.statusFilter = s;
  render();
}

function render() {
  const app = document.getElementById('app');
  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading dashboard...');
    return;
  }

  const pendingCount = state.applicants.filter(a => a.status === 'PENDING').length;

  app.innerHTML = `
    ${createHeader({ role: 'ADMISSION_STAFF', activePage: 'admission-dashboard', user: state.user })}
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="mb-8 flex justify-between items-end">
        <div>
            <h1 class="text-3xl font-bold text-gray-800">Admission Dashboard</h1>
            <p class="text-gray-600 mt-1">Manage student applications and registrations</p>
        </div>
        <div class="flex gap-4">
            <div class="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest">Pending Review</div>
                <div class="text-2xl font-black text-blue-700">${pendingCount}</div>
            </div>
        </div>
      </div>

      <div class="flex flex-col md:flex-row gap-4 mb-6">
          <div class="flex-1 relative">
            <input type="text" placeholder="Search by name or email..." class="form-input pl-10 h-11" oninput="handleSearch(this.value)">
            <svg class="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <select onchange="handleStatusFilter(this.value)" class="form-select w-48 h-11">
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
      </div>

      ${ApplicantModule.renderApplicantsTable()}
    </main>
  `;
}

init();
