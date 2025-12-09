# Epic 1 Frontend Implementation - Richwell Colleges Portal

## Overview

This document covers the frontend implementation for **Epic 1: Admissions & Student Onboarding** of the Richwell Colleges Portal.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Vite** | Build tool and dev server |
| **Vanilla JavaScript** | Core application logic |
| **Tailwind CSS v4** | Styling framework |
| **JWT** | Authentication tokens |

## Project Structure

```
frontend/
├── index.html                      # Enrollment form (main entry)
├── login.html                      # Login page
├── enrollment-success.html         # Success page after enrollment
├── student-dashboard.html          # Student dashboard
├── admission-dashboard.html        # Admission staff dashboard
├── vite.config.js                  # Vite configuration with API proxy
├── package.json                    # Dependencies
├── tailwind.config.js              # Tailwind configuration
└── src/
    ├── style.css                   # Tailwind CSS with custom components
    ├── api.js                      # API client with JWT token handling
    ├── utils.js                    # Utility functions
    ├── main.js                     # Main entry point
    └── pages/
        ├── enrollment.js           # Multi-step enrollment wizard
        ├── enrollment-success.js   # Success page logic
        ├── login.js                # Login with JWT auth
        ├── student-dashboard.js    # Student dashboard
        └── admission-dashboard.js  # Admission staff dashboard
```

## Pages Implemented

### 1. Public Enrollment Form (`/`)

**File:** `src/pages/enrollment.js`

A 5-step wizard for student enrollment:

| Step | Name | Fields |
|------|------|--------|
| 1 | Personal Info | first_name, last_name, email, birthdate, contact_number, address |
| 2 | Program Selection | program_id (radio buttons) |
| 3 | Documents | File upload (PDF, JPG, PNG) |
| 4 | Payment Commitment | monthly_commitment, is_transferee, previous_school, previous_course |
| 5 | Confirmation | Review all data, agree to terms |

**Features:**
- Form validation on each step
- Drag-and-drop file upload
- Dynamic program loading from API (with mock fallback)
- 6-month payment preview
- Transferee toggle with conditional fields

### 2. Login Page (`/login.html`)

**File:** `src/pages/login.js`

**Features:**
- Email/password authentication
- JWT token storage (localStorage)
- Password visibility toggle
- Role-based redirect after login
- Test account display for development

### 3. Student Dashboard (`/student-dashboard.html`)

**File:** `src/pages/student-dashboard.js`

**Features:**
- Profile card with student info
- 6 monthly payment progress bars
- Document upload section with verification status
- Exam permit cards (locked/unlocked based on payment)
- Quick actions menu (Enroll Subjects, View Grades, View Schedule)

### 4. Admission Dashboard (`/admission-dashboard.html`)

**File:** `src/pages/admission-dashboard.js`

**Features:**
- Applicant list table with pagination-ready structure
- Filter by status (Active/Pending) and source (Online/Transferee)
- Stats cards (Total, Online, Transferees, Pending Docs)
- Applicant detail modal
- Document verification workflow
- Dynamic role display based on logged-in user

### 5. Enrollment Success (`/enrollment-success.html`)

**File:** `src/pages/enrollment-success.js`

**Features:**
- Displays generated student number
- Next steps guidance
- Links to login and home

## API Integration

### API Client (`src/api.js`)

Centralized API client with:
- JWT token management (access, refresh)
- Automatic token refresh on 401
- User data storage in localStorage

### Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/accounts/login/` | User authentication |
| GET | `/api/v1/accounts/me/` | Get current user profile |
| GET | `/api/v1/admissions/programs/` | List available programs |
| POST | `/api/v1/admissions/enroll/` | Submit enrollment |
| GET | `/api/v1/admissions/applicants/` | List applicants (staff) |
| PATCH | `/api/v1/admissions/documents/{id}/verify/` | Verify document |

### Vite Proxy Configuration

The frontend proxies API requests to the Django backend:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true
    }
  }
}
```

## Utility Functions (`src/utils.js`)

| Function | Purpose |
|----------|---------|
| `showToast(message, type)` | Display toast notifications |
| `validateEmail(email)` | Email validation |
| `validatePhone(phone)` | Phone number validation |
| `validateRequired(value)` | Required field validation |
| `formatCurrency(amount)` | Format as Philippine Peso |
| `formatDate(dateString)` | Format date for display |
| `redirectByRole(role)` | Redirect user based on role |
| `requireAuth()` | Check authentication and redirect |
| `getQueryParam(name)` | Get URL query parameters |

## Styling

### Custom CSS Classes (`src/style.css`)

| Class | Purpose |
|-------|---------|
| `.card` | Glassmorphism card component |
| `.btn-primary` | Primary gradient button |
| `.btn-secondary` | Secondary outline button |
| `.form-input` | Styled form input |
| `.form-label` | Form label styling |
| `.badge` | Status badges (success, warning, error, info) |
| `.progress-bar` | Progress bar component |
| `.gradient-text` | Gradient text effect |
| `.step-indicator` | Wizard step indicators |
| `.table-container` | Styled table wrapper |
| `.fade-in` | Fade-in animation |

## Running the Application

### Prerequisites
- Node.js 18+
- Python 3.10+
- Django backend running on port 8000

### Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: **http://localhost:3000**

### Start Backend
```bash
cd backend
pip install -r requirements/development.txt
python manage.py migrate
python manage.py runserver
```
Backend runs at: **http://127.0.0.1:8000**

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@richwell.edu.ph | admin123 | Administrator |
| registrar@richwell.edu.ph | registrar123 | Registrar |

## Design Highlights

- **Glassmorphism**: Cards with backdrop blur and transparency
- **Gradient Buttons**: Blue-to-indigo gradient with hover effects
- **Responsive**: Mobile-first design with breakpoints
- **Animations**: Smooth transitions and fade-in effects
- **Toast Notifications**: User feedback for actions
- **Loading States**: Spinners and skeleton-like loading

## Future Enhancements (Epic 2+)

- Subject enrollment interface
- Grade viewing
- Schedule display
- Payment integration
- Document download
- Exam permit printing
