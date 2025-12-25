# Frontend Documentation - Richwell Colleges Portal

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Public Pages](#public-pages)
5. [Student Portal](#student-portal)
6. [Cashier Portal](#cashier-portal)
7. [Registrar Portal](#registrar-portal)
8. [API Integration](#api-integration)
9. [State Management](#state-management)
10. [Common Components](#common-components)

---

## Overview

The Richwell Colleges Portal is a comprehensive web application for managing student enrollment, payments, subject registration, and administrative tasks. The frontend is built with vanilla JavaScript and Tailwind CSS, communicating with a Django REST API backend.

**Key Features:**
- Student enrollment and subject registration
- Payment processing and tracking
- Registrar document management
- Subject and program management
- Real-time search and filtering
- Responsive design for all devices

---

## Technology Stack

- **HTML5**: Semantic markup
- **Tailwind CSS**: Utility-first CSS framework
- **Vanilla JavaScript (ES6+)**: No frameworks, pure JavaScript with modules
- **Fetch API**: HTTP requests to backend
- **LocalStorage**: JWT token and user session management
- **Django REST Framework**: Backend API

---

## Project Structure

```
frontend/
├── index.html                          # Landing page
├── login.html                          # Login page
├── enrollment.html                     # Public enrollment form
├── enrollment-success.html             # Enrollment confirmation
├── student-dashboard.html              # Student portal
├── cashier-dashboard.html              # Cashier portal
├── registrar-dashboard.html            # Registrar dashboard
├── registrar-documents.html            # Document release page
├── registrar-subjects.html             # Subject management page
├── registrar-enrollment.html           # Enrollment override page
├── logo.jpg                            # School logo
└── src/
    ├── style.css                       # Global styles (Tailwind)
    ├── api.js                          # API client & endpoints
    ├── utils.js                        # Utility functions
    └── pages/
        ├── enrollment.js               # Enrollment form logic
        ├── enrollment-success.js       # Success page logic
        ├── login.js                    # Login page logic
        ├── student-dashboard.js        # Student portal logic
        ├── cashier-dashboard.js        # Cashier portal logic
        ├── registrar-dashboard.js      # Registrar dashboard logic
        ├── registrar-documents.js      # Document release logic
        ├── registrar-subjects.js       # Subject management logic
        └── registrar-enrollment.js     # Enrollment override logic
```

---

## Public Pages

### 1. Landing Page (`index.html`)
**Purpose:** Introduction to Richwell Colleges with navigation to login and enrollment.

**Features:**
- School information and branding
- Call-to-action buttons for enrollment
- Links to login page

**Navigation:**
- `/login.html` - Login page
- `/enrollment.html` - New student enrollment

---

### 2. Login Page (`login.html` + `login.js`)
**Purpose:** Authentication for students, cashiers, and registrars.

**Features:**
- Username/password authentication
- JWT token management
- Role-based redirection
- "Remember me" functionality
- Error handling and validation

**Key Functions:**
```javascript
handleLogin(event)           // Process login form
redirectBasedOnRole(user)    // Redirect to appropriate dashboard
```

**API Endpoints:**
- `POST /accounts/login/` - User authentication

**User Roles & Redirects:**
- `STUDENT` → `/student-dashboard.html`
- `CASHIER` → `/cashier-dashboard.html`
- `REGISTRAR` → `/registrar-dashboard.html`

**Form Fields:**
- Username (required)
- Password (required)

---

### 3. Enrollment Page (`enrollment.html` + `enrollment.js`)
**Purpose:** Multi-step form for new student enrollment.

**Features:**
- 5-step enrollment process
- Program selection (API-driven)
- Document upload
- Payment commitment selection
- Form validation
- Transferee support

**Steps:**
1. **Personal Info** - Name, email, contact, address, birthdate
2. **Program Selection** - Choose academic program
3. **Document Upload** - Birth certificate, ID photo, transcript (for transferees)
4. **Payment Plan** - Monthly commitment (₱5,000 - ₱30,000)
5. **Confirmation** - Review and submit

**Key State:**
```javascript
state = {
  step: 1,                    // Current step (1-5)
  programs: [],               // Available programs from API
  formData: {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    birthdate: '',
    program_id: '',
    monthly_commitment: 5000,
    is_transferee: false,
    previous_school: '',
    previous_program: '',
    highest_grade_completed: '',
    birth_certificate: null,
    id_photo: null,
    previous_tor: null
  }
}
```

**Key Functions:**
```javascript
loadPrograms()              // Fetch programs from API
nextStep()                  // Move to next step with validation
prevStep()                  // Go back to previous step
validateStep()              // Validate current step
handleSubmit()              // Submit enrollment application
```

**API Endpoints:**
- `GET /admissions/programs/` - Load available programs
- `POST /admissions/enrollment/` - Submit enrollment

**Validation Rules:**
- Step 1: All personal info fields required
- Step 2: Program selection required
- Step 3: Birth certificate and ID photo required
- Step 4: Monthly commitment ≥ ₱5,000
- Step 5: Final review before submit

---

## Student Portal

### Student Dashboard (`student-dashboard.html` + `student-dashboard.js`)
**Purpose:** Central hub for student activities.

**Features:**
- Subject enrollment cart system
- Enrollment history with status badges
- Payment tracking
- Profile management
- Real-time prerequisite checking
- Unit cap enforcement (30 units max)

**Key State:**
```javascript
state = {
  user: null,                 // Current user profile
  loading: true,
  availableSubjects: [],      // Subjects available for enrollment
  cart: [],                   // Selected subjects
  enrollments: [],            // Enrollment history
  payments: [],               // Payment history
  currentSemester: null
}
```

**Subject Enrollment Flow:**
1. Browse available subjects
2. Add to cart (with prerequisite validation)
3. Review cart (total units displayed)
4. Submit enrollment request
5. Status: PENDING → awaiting payment
6. Cashier processes payment
7. Status: APPROVED → enrolled

**Status Badges:**
```javascript
PENDING     - Orange badge (awaiting payment)
APPROVED    - Green badge (enrolled)
REJECTED    - Red badge (rejected)
CANCELLED   - Gray badge (cancelled)
```

**Key Functions:**
```javascript
loadAvailableSubjects()     // Fetch enrollable subjects
addToCart(subjectId)        // Add subject to cart
removeFromCart(subjectId)   // Remove from cart
submitEnrollment()          // Submit enrollment request
checkPrerequisites(subject) // Validate prerequisites
calculateTotalUnits()       // Sum units in cart
```

**API Endpoints:**
- `GET /me/` - User profile
- `GET /enrollment/available-subjects/` - Available subjects
- `POST /enrollment/enroll/` - Submit enrollment
- `GET /enrollment/my-enrollments/` - Enrollment history
- `GET /payments/my-payments/` - Payment history

**Validation:**
- Maximum 30 units per semester
- Prerequisites must be met
- Subject must not be already enrolled
- Semester must be active

---

## Cashier Portal

### Cashier Dashboard (`cashier-dashboard.html` + `cashier-dashboard.js`)
**Purpose:** Process student payments and manage enrollment approvals.

**Features:**
- Student search with real-time filtering
- Pending enrollments view
- Payment recording
- Enrollment approval workflow
- Payment history tracking

**Key State:**
```javascript
state = {
  user: null,
  loading: true,
  searchQuery: '',
  searchResults: [],
  allStudents: [],
  selectedStudent: null,
  pendingEnrollments: [],
  showPaymentModal: false,
  paymentForm: {
    enrollment_id: null,
    amount: 0,
    payment_method: 'CASH',
    reference_number: '',
    notes: ''
  }
}
```

**Payment Processing Flow:**
1. Search for student by name/number
2. View pending enrollments
3. Record payment via modal
4. System auto-approves enrollment
5. Payment receipt generated

**Payment Methods:**
- CASH - Cash payment
- BANK_TRANSFER - Bank transfer
- GCASH - GCash payment
- CREDIT_CARD - Credit card

**Key Functions:**
```javascript
handleSearch(query)         // Filter students by name/number
loadPendingEnrollments()    // Fetch pending enrollments
openPaymentModal(enrollment)// Show payment form
processPayment()            // Record payment & approve enrollment
```

**API Endpoints:**
- `GET /enrollment/pending/` - Pending enrollments
- `POST /payments/record/` - Record payment
- `GET /students/search/` - Student search

**Payment Modal Fields:**
- Amount (required, auto-calculated from monthly commitment)
- Payment Method (dropdown)
- Reference Number (optional)
- Notes (optional)

---

## Registrar Portal

### 1. Registrar Dashboard (`registrar-dashboard.html` + `registrar-dashboard.js`)
**Purpose:** Overview of registrar activities and quick actions.

**Features:**
- Statistics cards (students, pending enrollments, active subjects)
- Quick action cards
- Navigation to other registrar pages

**Navigation Links:**
- Dashboard - Overview and stats
- Documents - Student document release
- Subjects - Subject management
- Override - Enrollment overrides

**Quick Actions:**
1. **Document Release** - Release official documents (COR, TOR, etc.)
2. **Subject Management** - Manage subjects and prerequisites
3. **Enrollment Override** - Override enrollment restrictions

**Statistics Displayed:**
- Total students enrolled
- Pending enrollments
- Active subjects
- Documents released (if applicable)

---

### 2. Document Release Page (`registrar-documents.html` + `registrar-documents.js`)
**Purpose:** Search students and release official documents.

**Features:**
- Student search with real-time filtering
- Document release modal
- Multiple document types
- Audit trail tracking

**Key State:**
```javascript
state = {
  user: null,
  loading: true,
  loadingStudents: false,
  searchQuery: '',
  searchResults: [],
  allStudents: [],
  selectedStudent: null,
  showReleaseModal: false,
  releaseForm: {
    document_type: 'COR',
    purpose: '',
    copies_released: 1,
    notes: ''
  }
}
```

**Document Types:**
- **COR** - Certificate of Registration
- **TOR** - Transcript of Records
- **GOOD_MORAL** - Certificate of Good Moral
- **DIPLOMA** - Diploma
- **HONORABLE_DISMISSAL** - Honorable Dismissal

**Document Release Flow:**
1. Search for student by name or student number
2. Click "Release Document" button
3. Modal opens with student details
4. Select document type
5. Enter purpose, copies, and notes
6. Submit release request
7. System generates document code
8. Document is tracked in audit log

**Key Functions:**
```javascript
loadAllStudents()           // Fetch all enrolled students
handleSearch(query)         // Filter students
openReleaseModal(studentId) // Show release form
handleReleaseDocument()     // Submit document release
closeReleaseModal()         // Close modal
```

**API Endpoints:**
- `GET /enrollment/students/` - Student list
- `POST /admissions/documents/release/` - Release document
- `GET /admissions/documents/my-releases/` - Release history

**Release Form Fields:**
- Document Type (dropdown, required)
- Purpose (text, optional) - e.g., "For employment", "For scholarship"
- Number of Copies (number, 1-10, required)
- Notes (textarea, optional) - Internal notes

**Search Features:**
- Real-time filtering
- Search by student number
- Search by full name
- Search by first/last name

---

### 3. Subject Management Page (`registrar-subjects.html` + `registrar-subjects.js`)
**Purpose:** Full CRUD operations for academic subjects.

**Features:**
- Subject listing with filtering
- Add/Edit subject modals
- Program filter dropdown
- Prerequisites management
- Live search for prerequisites
- Multiple prerequisites per subject

**Key State:**
```javascript
state = {
  user: null,
  loading: true,
  subjects: [],
  programs: [],
  selectedProgram: null,
  showAddModal: false,
  showEditModal: false,
  editingSubject: null,
  formData: {
    code: '',
    name: '',
    description: '',
    units: 3,
    program: '',
    year_level: 1,
    semester_number: 1,
    has_prerequisites: false,
    prerequisites: []
  },
  prerequisiteSearch: '',
  filteredPrerequisites: []
}
```

**Subject Table Columns:**
1. **Code** - Subject code (e.g., CS101)
2. **Name** - Subject title
3. **Program** - Program code (e.g., BSIT)
4. **Year** - Year level (1-4)
5. **Sem** - Semester number (1-3)
6. **Units** - Credit units
7. **Prerequisites** - Purple badges showing prerequisite codes
8. **Actions** - Edit/Delete buttons

**Add/Edit Subject Form Fields:**
- Code (text, required) - e.g., "CS101"
- Name (text, required) - e.g., "Introduction to Programming"
- Description (textarea, optional)
- Units (number, 1-6, default: 3)
- Program (dropdown, required)
- Year Level (dropdown, 1-4)
- Semester (dropdown, 1-3)
- Has Prerequisites (checkbox)
  - If checked: Shows prerequisite search section
  - Live search input
  - Search results with "Add" buttons
  - Selected prerequisites list with "Remove" buttons

**Prerequisites System:**
```javascript
// Prerequisite workflow
1. Check "Has Prerequisites" checkbox
2. Search section appears
3. Type subject code or name
4. Filtered results appear (excludes already selected)
5. Click "Add" to select prerequisite
6. Purple badge appears in selected list
7. Click "Remove" to deselect
8. On submit, prerequisite IDs sent to backend
```

**Key Functions:**
```javascript
loadSubjects()              // Fetch all subjects
loadPrograms()              // Fetch all programs
filterByProgram(programId)  // Filter subjects by program
openAddModal()              // Show add subject form
openEditModal(subjectId)    // Show edit form with data
handleAddSubject()          // Create new subject
handleEditSubject()         // Update existing subject
handleDeleteSubject()       // Delete subject
togglePrerequisiteSection() // Show/hide prerequisite search
searchPrerequisites(mode)   // Live search prerequisites
addPrerequisite()           // Add to selected list
removePrerequisite()        // Remove from selected list
isPrerequisiteSelected()    // Check if already selected
getSelectedPrerequisites()  // Get array of selected IDs
```

**API Endpoints:**
- `GET /academics/manage/subjects/` - List subjects
- `POST /academics/manage/subjects/` - Create subject
- `PUT /academics/manage/subjects/{id}/` - Update subject
- `DELETE /academics/manage/subjects/{id}/` - Delete subject
- `GET /academics/programs/` - List programs

**Backend Field Mapping:**
```javascript
// Frontend → Backend
name → title
program_id → program
prerequisites → prerequisite_ids (array of UUIDs)
```

**Validation Rules:**
- Code: Required, unique per program
- Name/Title: Required
- Units: 1-6
- Program: Required
- Year Level: 1-4
- Semester: 1-3
- Prerequisites: Optional, can be multiple

**Filter Features:**
- Program dropdown filter
- Shows total subjects count
- Real-time filtering on program change
- "All Programs" option to clear filter

---

### 4. Enrollment Override Page (`registrar-enrollment.html` + `registrar-enrollment.js`)
**Purpose:** Override enrollment restrictions for special cases.

**Features:**
- Student search
- Enrollment history view
- Manual enrollment approval/rejection
- Override prerequisites
- Override unit caps

**Key Functions:**
```javascript
searchStudent()             // Find student
viewEnrollments()           // See enrollment history
overrideEnrollment()        // Approve despite restrictions
```

**API Endpoints:**
- `POST /enrollment/override/` - Override enrollment restrictions

---

## API Integration

### API Client (`api.js`)

**Base Configuration:**
```javascript
const API_BASE_URL = '/api/v1';
```

**Token Manager:**
```javascript
TokenManager = {
  getAccessToken()           // Retrieve JWT access token
  getRefreshToken()          // Retrieve refresh token
  setTokens(access, refresh) // Store tokens
  clearTokens()              // Remove tokens (logout)
  getUser()                  // Get user from localStorage
  setUser(user)              // Store user profile
  isAuthenticated()          // Check if logged in
}
```

**HTTP Methods:**
```javascript
api.get(endpoint)           // GET request
api.post(endpoint, data)    // POST request
api.put(endpoint, data)     // PUT request
api.patch(endpoint, data)   // PATCH request
api.delete(endpoint)        // DELETE request
api.postFormData(endpoint, formData) // POST with file upload
```

**Features:**
- Automatic JWT token attachment
- Auto token refresh on 401
- Auto redirect to login on auth failure
- Error handling and logging

**Example Usage:**
```javascript
// GET request
const students = await api.get('/enrollment/students/');

// POST request
const response = await api.post('/enrollment/enroll/', {
  subject_ids: ['uuid1', 'uuid2']
});

// File upload
const formData = new FormData();
formData.append('birth_certificate', file);
await api.postFormData('/enrollment/upload/', formData);
```

---

### API Endpoints Reference

**Authentication:**
- `POST /accounts/login/` - User login
- `POST /accounts/token/refresh/` - Refresh access token
- `GET /accounts/me/` - Get current user profile

**Enrollment:**
- `GET /admissions/programs/` - List programs
- `POST /admissions/enrollment/` - Submit enrollment
- `GET /enrollment/available-subjects/` - Available subjects
- `POST /enrollment/enroll/` - Enroll in subjects
- `GET /enrollment/my-enrollments/` - Student enrollments
- `GET /enrollment/pending/` - Pending enrollments (cashier)
- `POST /enrollment/override/` - Override enrollment (registrar)

**Payments:**
- `POST /payments/record/` - Record payment
- `GET /payments/my-payments/` - Student payment history

**Documents:**
- `POST /admissions/documents/release/` - Release document
- `GET /admissions/documents/my-releases/` - Registrar's releases
- `GET /admissions/documents/all/` - All releases (head registrar)

**Subjects:**
- `GET /academics/manage/subjects/` - List subjects
- `POST /academics/manage/subjects/` - Create subject
- `PUT /academics/manage/subjects/{id}/` - Update subject
- `DELETE /academics/manage/subjects/{id}/` - Delete subject
- `GET /academics/programs/` - List programs

**Students:**
- `GET /enrollment/students/` - Student list (registrar/cashier)
- `GET /students/search/` - Search students

---

## State Management

All pages use a similar state management pattern:

**Pattern:**
```javascript
const state = {
  user: null,           // Current user profile
  loading: true,        // Global loading state
  // ... page-specific state
};

async function init() {
  // Load initial data
  await loadUserProfile();
  await loadPageData();
  state.loading = false;
  render();
}

function render() {
  // Re-render entire page based on state
  const app = document.getElementById('app');
  app.innerHTML = generateHTML();
  attachEventListeners();
}
```

**Benefits:**
- Single source of truth
- Predictable state updates
- Easy debugging
- Clear data flow

---

## Common Components

### 1. Toast Notifications (`utils.js`)
```javascript
showToast(message, type = 'info')
// Types: 'success', 'error', 'warning', 'info'
```

**Features:**
- Auto-dismiss after 3 seconds
- Color-coded by type
- Slide-in animation
- Stacking support

---

### 2. Loading States
```javascript
function renderLoading() {
  return `
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <svg class="w-12 h-12 animate-spin text-blue-600 mx-auto">
          <!-- Spinner SVG -->
        </svg>
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  `;
}
```

---

### 3. Modal Pattern
```javascript
// Modal state
state.showModal = false;

// Open modal
function openModal() {
  state.showModal = true;
  render();
}

// Close modal
function closeModal() {
  state.showModal = false;
  render();
}

// Render modal
function renderModal() {
  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
         onclick="closeModal()">
      <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl"
           onclick="event.stopPropagation()">
        <!-- Modal content -->
      </div>
    </div>
  `;
}
```

---

### 4. Authentication Guard (`utils.js`)
```javascript
requireAuth()
// Redirects to login if not authenticated
// Returns true if authenticated, false otherwise
```

**Usage:**
```javascript
async function init() {
  if (!requireAuth()) return;
  // ... rest of initialization
}
```

---

### 5. Status Badges
```javascript
// Subject enrollment status
PENDING   → bg-orange-100 text-orange-800
APPROVED  → bg-green-100 text-green-800
REJECTED  → bg-red-100 text-red-800
CANCELLED → bg-gray-100 text-gray-800

// Payment status
PAID      → bg-green-100 text-green-800
PENDING   → bg-yellow-100 text-yellow-800
OVERDUE   → bg-red-100 text-red-800
```

---

## Design System

### Colors
- **Primary Blue:** `#3B82F6` (blue-600)
- **Success Green:** `#10B981` (green-500)
- **Warning Orange:** `#F59E0B` (orange-500)
- **Error Red:** `#EF4444` (red-500)
- **Gray Scale:** gray-50 to gray-900

### Typography
- **Headings:** font-bold, gradient text effect
- **Body:** text-gray-600 to text-gray-900
- **Small text:** text-xs to text-sm

### Spacing
- **Cards:** p-6 to p-8
- **Sections:** py-8 to py-12
- **Gaps:** gap-2 to gap-8

### Buttons
```css
.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-700 hover:bg-gray-300;
}

.btn-danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}
```

### Form Inputs
```css
.form-input {
  @apply w-full px-4 py-2 border border-gray-300 rounded-lg
         focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.form-select {
  @apply w-full px-4 py-2 border border-gray-300 rounded-lg
         bg-white cursor-pointer;
}
```

### Cards
```css
.card {
  @apply bg-white rounded-2xl shadow-lg p-6;
}
```

---

## Best Practices

### 1. Code Organization
- One page = one HTML + one JS file
- Shared logic in `api.js` and `utils.js`
- Keep state management consistent
- Use clear function names

### 2. Error Handling
- Always wrap API calls in try-catch
- Show user-friendly error messages
- Log errors to console for debugging
- Handle network failures gracefully

### 3. Performance
- Minimize DOM manipulation
- Use event delegation where possible
- Lazy load images
- Cache API responses when appropriate

### 4. Security
- Never store sensitive data in localStorage (except JWT)
- Validate user input
- Sanitize displayed data
- Use HTTPS in production

### 5. Accessibility
- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation
- Maintain color contrast

---

## Known Issues & Future Improvements

### Current Issues
1. **Document Release 400 Error** - Validation error when releasing documents (under investigation)

### Future Improvements
1. Implement pagination for large lists
2. Add advanced filtering options
3. Export data to Excel/PDF
4. Real-time notifications with WebSockets
5. Offline support with Service Workers
6. Dark mode support
7. Mobile app version
8. Bulk operations support

---

## Development Workflow

### Local Development
1. Start Django backend: `python manage.py runserver`
2. Serve frontend: Use Live Server or similar
3. Access at `http://localhost:3000`

### Testing
- Manual testing in Chrome, Firefox, Safari
- Mobile responsive testing
- Cross-browser compatibility

### Deployment
1. Build CSS with Tailwind
2. Minify JavaScript
3. Optimize images
4. Deploy to static hosting
5. Configure CORS on backend

---

## Contact & Support

**Frontend Developers:**
- Lloyd
- Edjohn

**Backend Developers:**
- Kirt
- Anne

**QA Team:**
- Marjorie
- Yasmien
- Aira

**Documentation:**
- Jun

---

**Last Updated:** December 25, 2025
**Version:** 1.0
**Status:** Production Ready (with minor issues)
