# Permission System

## Overview
The permission system provides role-based access control (RBAC) for the application. It allows you to conditionally render components and restrict access based on user roles and permissions.

## Structure

```
src/permissions/
├── constants.js          # Permission and role definitions
├── hooks/
│   └── usePermissions.js # React hooks for permission checking
└── components/
    └── PermissionGate.jsx # Components for conditional rendering
```

## Usage

### 1. Using Permission Hooks

```jsx
import { usePermission } from '../permissions/hooks/usePermissions';
import { PERMISSIONS } from '../permissions/constants';

function MyComponent() {
    const canEdit = usePermission(PERMISSIONS.STUDENTS_EDIT);
    
    return (
        <div>
            {canEdit && <button>Edit Student</button>}
        </div>
    );
}
```

### 2. Using Permission Gates

```jsx
import { PermissionGate } from '../permissions/components/PermissionGate';
import { PERMISSIONS } from '../permissions/constants';

function MyComponent() {
    return (
        <PermissionGate 
            permission={PERMISSIONS.STUDENTS_EDIT}
            fallback={<p>You don't have permission to edit students</p>}
        >
            <button>Edit Student</button>
        </PermissionGate>
    );
}
```

### 3. Checking Multiple Permissions

```jsx
import { useAnyPermission, useAllPermissions } from '../permissions/hooks/usePermissions';
import { PERMISSIONS } from '../permissions/constants';

function MyComponent() {
    // User needs at least ONE of these permissions
    const canManageAcademics = useAnyPermission([
        PERMISSIONS.SUBJECTS_MANAGE,
        PERMISSIONS.SECTIONS_MANAGE,
        PERMISSIONS.SEMESTERS_MANAGE
    ]);
    
    // User needs ALL of these permissions
    const canFinalizeGrades = useAllPermissions([
        PERMISSIONS.GRADES_VIEW,
        PERMISSIONS.GRADES_FINALIZE
    ]);
    
    return (
        <div>
            {canManageAcademics && <button>Manage Academics</button>}
            {canFinalizeGrades && <button>Finalize Grades</button>}
        </div>
    );
}
```

## Available Roles

- `SUPERADMIN` - Full system access
- `ADMIN` - Administrative access
- `REGISTRAR` - Student and academic management
- `CASHIER` - Payment management
- `ADMISSION` - Applicant management
- `PROFESSOR` - Grade submission
- `HEAD` - Grade approval
- `STUDENT` - Limited access

## Available Permissions

### User Management
- `USERS_VIEW`, `USERS_CREATE`, `USERS_EDIT`, `USERS_DELETE`

### Student Management
- `STUDENTS_VIEW`, `STUDENTS_CREATE`, `STUDENTS_EDIT`, `STUDENTS_DELETE`

### Academic Management
- `SUBJECTS_MANAGE`, `SECTIONS_MANAGE`, `SEMESTERS_MANAGE`

### Grade Management
- `GRADES_VIEW`, `GRADES_SUBMIT`, `GRADES_APPROVE`, `GRADES_FINALIZE`

### Financial Management
- `PAYMENTS_VIEW`, `PAYMENTS_RECORD`

### Enrollment Management
- `ENROLLMENT_VIEW`, `ENROLLMENT_APPROVE`

### Admission Management
- `ADMISSION_VIEW`, `ADMISSION_APPROVE`

### System Configuration
- `SYSTEM_CONFIG`, `AUDIT_LOGS`

## Adding New Permissions

1. Add the permission to `PERMISSIONS` in `constants.js`
2. Add the permission to appropriate roles in `ROLE_PERMISSIONS`
3. Use the permission in your components via hooks or gates

## Best Practices

1. **Use Permission Gates for UI elements** - Hide buttons/links users shouldn't see
2. **Always validate on backend** - Frontend permissions are for UX only
3. **Use descriptive permission names** - Follow the `resource.action` pattern
4. **Group related permissions** - Makes role management easier
5. **Document custom permissions** - Update this README when adding new ones
