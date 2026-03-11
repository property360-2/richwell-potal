# Richwell Portal — Product Stabilization & Remaining Plans

## Phase 12: Product Stabilization (Immediate Focus)

### 12.1 — Test Resilience & DOM Stability
**Task:** Ensure E2E tests run reliably without timing out or breaking due to React side-effects.
**Steps:**
1. **[COMPLETED]** Modified `AuthContext.jsx` to prevent the `auth-expired` event from forcing a hard `window.location.href = '/login?expired=true'` redirect when the user is already on a public page (like `/login`). This prevents the DOM from tearing down while tests are interacting with the form.
2. Refine Playwright tests to use robust locators.
3. Test Data Seeding: Create a `playwright.setup.js` to seed reliable test data for E2E suites.

### 12.2 — Frontend API Standardization
**Task:** Eliminate random build errors and inconsistent imports.
**Steps:**
1. Complete the migration of all remaining singular API imports (`studentApi`, `termApi`, `academicApi`) to their correct plural forms (`studentsApi`, `termsApi`, `academicsApi`) across all React components.
2. Verify all 50+ pages compile successfully without Vite `No matching export` errors.

### 12.3 — Global Error Handling
**Task:** Protect the UI from crashing fully during unhandled backend exceptions.
**Steps:**
1. Establish a global Axios interceptor for 500-level errors to trigger a Toast notification instead of failing silently.
2. Ensure `<ErrorBoundary>` catches and gracefully degrades any rendering failures.

---

## Phase 13: Final Deployment Pre-Requisites

### 13.1 — Security Hardening & Audit Remediation
**Task:** Lock down the Django backend for a production environment based on the final QA audit.
**Steps:**
1. Enforce `DEBUG = False` in production settings to prevent traceback exposure.
2. Configure `ALLOWED_HOSTS` to exactly match the production domain.
3. Review `CORS_ALLOWED_ORIGINS` to ensure only the production frontend URL is whitelisted (Medium Risk identified in QA).
4. Implement Django DRF Throttling (`AnonRateThrottle` / `SimpleRateThrottle`) on the Login API to mitigate brute-force password guessing.

### 13.2 — CI/CD Pipeline & E2E Expansion
**Task:** Automate tests and deployments.
**Steps:**
1. Expand the E2E Test Suite (Playwright) to cover core Registrar and Dean workflows.
2. Create a CI/CD workflow (e.g., GitHub Actions) to automatically run tests prior to production deployment.

### 13.3 — Database Optimization (Recommended)
**Task:** Ensure the system scales seamlessly under enrollment loads.
**Steps:**
1. Review database index utilization for high-traffic queries in `StudentEnrollment` and `Grade`.
2. Confirm the `select_for_update()` transaction blocks correctly resolve concurrent ID generation without deadlocking.

### 13.4 — UX/UI Polish & Performance
**Task:** Implement final user experience refinements.
**Steps:**
1. **Global Loading Bar:** Implement a top-bar progress indicator (like `nprogress`) for lazy-loaded routes to improve perceived performance during initial chunks load.
2. **Sentry Integration:** Add error tracking to catch edge-case frontend crashes in production.
