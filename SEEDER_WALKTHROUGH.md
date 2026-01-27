# Full System Seeder Walkthrough

The system has been populated with realistic data covering all core modules (Academics, Enrollment, Finance, Audit, Accounts).

## seeded Data Overview

### 1. Accounts & Roles
| Role | Email | Password | Details |
|------|-------|----------|---------|
| **Admin** | `admin@richwell.edu` | `password123` | Superuser, System Admin |
| **Registrar** | `registrar@richwell.edu` | `password123` | Admin access, Curriculum Creator |
| **Head Registrar** | `head.registrar@richwell.edu` | `password123` | Oversees Registrar Operations |
| **Dept Head** | `head@richwell.edu` | `password123` | Enrollment Approver |
| **Admission Staff** | `admission@richwell.edu` | `password123` | Enrollment Processor |
| **Cashier** | `cashier@richwell.edu` | `password123` | Payment Processor |
| **Professor** | `prof1@richwell.edu` (1-5) | `password123` | Faculty members with schedules |
| **Student A** | `student.a@richwell.edu` | `password123` | **Regular**, Fully Paid & Enrolled (Active) |
| **Student B** | `student.b@richwell.edu` | `password123` | **Regular**, Pending Payment |
| **Student C** | `student.c@richwell.edu` | `password123` | **Irregular**, Retaking CS101 (Failed previously) |
| **Student D** | `student.d@richwell.edu` | `password123` | **Overload**, Taking 3rd year + extra subjects |

### 2. Academics Structure
*   **Program**: BSIT (Bachelor of Science in Information Technology)
*   **Curriculum**: 2024-REV (Active)
    *   *Includes Curriculum Version snapshot v1*
*   **Sections**:
    *   `BSIT-1A` (Year 1)
    *   `BSIT-1B` (Year 1)
    *   `BSIT-2A` (Year 2)
    *   `BSIT-3A` (Year 3)
*   **Schedule**: Auto-generated conflict-free schedules for all sections.

### 3. Finance (Payment Buckets)
*   Each enrollment generates **6 Monthly Payment Buckets**.
*   **Student A**: All buckets `is_fully_paid = True`.
*   **Student B**: All buckets `is_fully_paid = False`.

### 4. Audit Trail
*   **System Events**: User creation logs.
*   **Curriculum Events**: Curriculum creation logs.
*   **Enrollment Events**: Status change logs (e.g., Pending -> Active by Dept Head).

### 5. RBAC Permissions
*   **Categories**: Academic Management, Enrollment Management, User Management.
*   **Permissions**: `program.view`, `curriculum.manage`, `enrollment.process`, `user.view`.

## Verification Steps
1.  **Check Dashboard**: Login as `student.a@richwell.edu`. You should see "Active" status and "Enrolled" subjects with full schedule details.
2.  **Check Curriculum**: Note the "2024-REV" badge on the dashboard.
3.  **Check Retake Logic**: Login as `student.c@richwell.edu`. Go to Enrollment. Notice you can select a section for `CS101` (Retake).
4.  **Check Payment Status**: Login as `student.b@richwell.edu`. Dashboard should warn about "Pending Payment".
