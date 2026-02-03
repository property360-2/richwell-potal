import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth, formatCurrency } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';

// Import Modules
import { EnrollmentService } from './EnrollmentService.js';
import { CartModule } from './modules/CartModule.js';
import { SubjectModule } from './modules/SubjectModule.js';
import { EnrollmentUI } from './modules/EnrollmentUI.js';
import { EnrollmentModals } from './modules/EnrollmentModals.js';

const state = {
  user: null,
  loading: true,
  recommendedSubjects: [],
  availableSubjects: [],
  enrolledSubjects: [],
  cart: [],
  maxUnits: 30,
  enrollmentStatus: null,
  filters: { yearLevel: null, semester: null },
  yearLevelToggles: {},
  noCurriculumError: null,
  savedCartIds: [] // Temp storage for IDs from localStorage
};

const ctx = {
  state,
  service: EnrollmentService,
  cart: CartModule,
  subjects: SubjectModule,
  ui: EnrollmentUI,
  modals: EnrollmentModals,

  render: () => render(),

  loadData: async () => {
    try {
      const data = await EnrollmentService.loadEnrollmentData();
      state.user = data.user;
      state.enrollmentStatus = data.enrollmentStatus?.status;
      state.recommendedSubjects = data.recommendedSubjects.map(mapSubject);
      state.availableSubjects = data.availableSubjects.map(mapSubject);
      state.enrolledSubjects = data.enrolledSubjects;
      state.maxUnits = data.student?.max_units || 30;

      // Reconnect cart if we have saved IDs
      if (state.savedCartIds.length > 0 && state.cart.length === 0) {
        state.savedCartIds.forEach(saved => {
          const subject = state.recommendedSubjects.find(s => s.id === saved.subjectId) ||
            state.availableSubjects.find(s => s.id === saved.subjectId);
          const section = subject?.sections.find(sec => sec.id === saved.sectionId);
          if (subject && section) state.cart.push({ subject, section });
        });
        state.savedCartIds = [];
      }
    } catch (e) { ErrorHandler.handle(e); }
  },

  finalizeEnrollment: async () => {
    const payload = {
      enrollments: state.cart.map(item => ({
        subject: item.subject.id,
        section: item.section.id
      }))
    };
    try {
      await EnrollmentService.enrollSubjects(payload);
      Toast.success('Enrollment successful!');
      CartModule.clearCart();
      await ctx.loadData();
      render();
    } catch (e) { ErrorHandler.handle(e); }
  }
};

function mapSubject(s) {
  return {
    ...s,
    id: s.id,
    code: s.code,
    title: s.title || s.name,
    units: s.units,
    year_level: s.year_level,
    semester_number: s.semester_number,
    prerequisite_met: s.can_enroll !== false,
    missing_prerequisites: s.missing_prerequisites || [],
    sections: (s.available_sections || s.sections || []).map(sec => ({
      id: sec.id || sec.section_id,
      name: sec.name || sec.section_name,
      slots: sec.slots || sec.available_slots || 40,
      enrolled: sec.enrolled_count || 0
    }))
  };
}

async function init() {
  if (!requireAuth()) return;

  CartModule.init(ctx);
  SubjectModule.init(ctx);
  EnrollmentUI.init(ctx);
  EnrollmentModals.init(ctx);

  await ctx.loadData();
  state.loading = false;
  render();
}

function render() {
  const app = document.getElementById('app');
  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading enrollment data...');
    return;
  }

  const isApproved = state.user?.student_number && (state.enrollmentStatus === 'ACTIVE' || state.enrollmentStatus === 'ENROLLED');
  const hasEnrolled = state.enrolledSubjects.length > 0;

  app.innerHTML = `
    ${createHeader({ role: 'STUDENT', activePage: 'subject-enrollment', user: state.user })}
    <main class="max-w-7xl mx-auto px-4 py-8">
        ${!isApproved ? EnrollmentUI.renderAdmissionPending() :
      (hasEnrolled ? EnrollmentUI.renderEnrolledView() : EnrollmentUI.renderEnrollmentBuilder())}
    </main>
  `;
}

init();
