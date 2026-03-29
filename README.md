# Richwell Portal — Academic & Enrollment Management System

Richwell Portal is a comprehensive student life-cycle management system designed for **Richwell Colleges**. It handles everything from prospective student applications to academic advising, scheduling, and grade finalization.

## 🚀 Quick Start

### Backend (Django)
1. **Initialize Environment**:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. **Database Setup**:
   ```powershell
   python manage.py migrate
   ```
3. **Data Seeding** (for development):
   * `python manage.py seed_applicants` — Admission pipeline scenarios.
   * `python manage.py seed_advising` — Populate enrolled students and scheduling data.
   * `python manage.py seed_grade_submission` — Scenarios for INC resolution.
   * `python manage.py seed_full_cycle` — Complete end-to-end data setup.

### Frontend (React + Vite)
1. **Install Dependencies**:
   ```powershell
   cd frontend
   npm install
   ```
2. **Run Dev Server**:
   ```powershell
   npm run dev
   ```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Core** | Django 5.0 (REST Framework), React 19 (Vite) |
| **Database** | PostgreSQL, SQLite (Dev) |
| **Auth** | SimpleJWT (Access/Refresh Cookie-based Rotations) |
| **UI** | Vanilla CSS, Lucide Icons, React Hook Form |
| **Testing** | Playwright (E2E), Vitest (Unit), Pytest (Backend) |

---

## 📂 Project Structure

- `backend/` — Django project root.
- `frontend/` — Vite + React application.
- `docs/` — Comprehensive feature flow documentation.
  - `docs/flows/` — Detailed business logic walkthroughs.
  - `docs/api/` — API endpoint contracts and overview.
  - `docs/security/` — Permission matrices and role definitions.

---

## 🧪 Testing

### Frontend
- **E2E**: `npm run test:e2e` or `npm run test:e2e:ui`
- **Unit**: `npm run test:unit`

### Backend
- **Unit/Integration**: `pytest`

---

## 📘 Documentation Map

For detailed information on specific workflows, refer to the following:
- [Admission to Enrollment Flow](docs/flows/admission-to-enrollment.md)
- [Payment Lifecycle](docs/flows/payment-lifecycle.md)
- [INC Resolution Workflow](docs/flows/inc-resolution.md)
- [API Overview](docs/api/overview.md)
- [Permission Matrix](docs/security/permission-matrix.md)

---

> [!NOTE]
> This project follows strict [Global Rules] for documentation. Every file must contain a descriptive header, and all logic must be explicitly commented.
