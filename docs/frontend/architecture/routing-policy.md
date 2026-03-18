# Routing & Permission Policy

## Overview
The frontend uses a tiered routing system where access to specific paths is restricted based on the user's role defined in the `AuthContext`.

## Route Tiers

### 1. Public Routes
- **Paths**: `/login`, `/apply`, `/forgot-password`
- **Access**: Anyone. Authenticated users are usually redirected away from `/login`.

### 2. Private Routes (Authenticated)
- **Paths**: `/dashboard`, `/profile`, `/settings`
- **Access**: Any logged-in user.

### 3. Role-Based Routes
| Role | Path Prefix | Key Features |
|------|-------------|--------------|
| STUDENT | `/student/` | Enrollment, Grades, Account |
| PROFESSOR | `/professor/` | Grade Entry, INC Resolutions |
| REGISTRAR | `/registrar/` | Admissions, Student Records, Grades Review |
| ADMISSION | `/admission/` | Applicant Review, Approval |
| CASHIER | `/cashier/` | Payment Recording, Adjustments |
| DEAN | `/dean/` | Scheduling, Faculty Loading |
| HEAD_REGISTRAR| `/registrar/` | + Audit Logs, User Management |

## Implementation
Roles are checked in the `App.jsx` or specialized `ProtectedRoute` components:

```javascript
<Route 
  path="/registrar/*" 
  element={
    <ProtectedRoute allowedRoles={['REGISTRAR', 'HEAD_REGISTRAR']}>
      <RegistrarLayout />
    </ProtectedRoute>
  } 
/>
```

## Security Note
While the frontend hides routes, **all security is enforced on the backend**. Every backend API endpoint validates the user's role before processing the request.
