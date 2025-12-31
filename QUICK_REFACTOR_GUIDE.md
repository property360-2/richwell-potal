# Quick Refactoring Guide

**For the remaining 24 pages** - Follow this checklist to refactor each page in ~30-45 minutes.

---

## ✅ Step-by-Step Checklist

### 1. Update Imports (2 min)

```javascript
// Remove
import { showToast, requireAuth } from '../utils.js';

// Add
import { requireAuth } from '../utils.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal, ConfirmModal, AlertModal } from '../components/Modal.js';
```

---

### 2. Replace Loading State (5 min)

**Find and Replace:**
```javascript
// FIND:
function renderLoading() {
  return `
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <svg class="w-12 h-12 animate-spin text-blue-600 mx-auto" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  `;
}

// DELETE THE ENTIRE FUNCTION

// FIND:
app.innerHTML = renderLoading();

// REPLACE WITH:
app.innerHTML = LoadingOverlay('Loading...');
```

---

### 3. Replace Error Handling (10 min)

**Find all instances of:**
```javascript
// FIND:
try {
  const response = await api.get(endpoint);
  state.data = response;
} catch (error) {
  console.error('Failed to load:', error);
  showToast('Failed to load data', 'error');
  state.data = [];
}

// REPLACE WITH:
try {
  const response = await api.get(endpoint);
  state.data = response;
} catch (error) {
  ErrorHandler.handle(error, 'Loading data');
  state.data = [];
}
```

**For loadUserProfile specifically:**
```javascript
// FIND:
catch (error) {
  console.error('Failed to load profile:', error);
  const savedUser = TokenManager.getUser();
  if (savedUser) state.user = savedUser;
}

// REPLACE WITH:
catch (error) {
  ErrorHandler.handle(error, 'Loading user profile', { showToast: false });
  const savedUser = TokenManager.getUser();
  if (savedUser) state.user = savedUser;
}
```

---

### 4. Replace Toast Calls (5 min)

**Simple Find & Replace:**

| Find | Replace |
|------|---------|
| `showToast('` | `Toast.success('` or `Toast.error('` |
| `, 'success')` | `)` |
| `, 'error')` | `)` |
| `, 'warning')` | `)` (if using Toast.warning) |
| `, 'info')` | `)` (if using Toast.info) |

**Examples:**
```javascript
// FIND:
showToast('Program added successfully', 'success');
// REPLACE:
Toast.success('Program added successfully');

// FIND:
showToast('Failed to delete program', 'error');
// REPLACE:
Toast.error('Failed to delete program');
```

---

### 5. Replace Confirm Dialogs (10 min)

**Find:**
```javascript
if (!confirm('Are you sure you want to delete this item?')) {
  return;
}
```

**Replace:**
```javascript
const confirmed = await ConfirmModal({
  title: 'Delete Item',
  message: 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmLabel: 'Delete',
  danger: true
});

if (!confirmed) return;
```

**Common patterns:**
```javascript
// Delete confirmation
const confirmed = await ConfirmModal({
  title: 'Delete [Item]',
  message: 'Are you sure you want to delete this [item]? This action cannot be undone.',
  confirmLabel: 'Delete',
  danger: true
});

// General confirmation
const confirmed = await ConfirmModal({
  title: 'Confirm Action',
  message: 'Are you sure you want to [action]?',
  confirmLabel: 'Confirm',
  danger: false
});

// Set as current/activate
const confirmed = await ConfirmModal({
  title: 'Set as Current',
  message: `Set "${item.name}" as the current [item]?`,
  confirmLabel: 'Set as Current',
  danger: false
});
```

---

### 6. Replace Alert Dialogs (5 min)

**Find:**
```javascript
alert('This is already the current semester');
```

**Replace:**
```javascript
await AlertModal('This is already the current semester', 'Notice');
```

**Or with validation errors:**
```javascript
// FIND:
if (errors.length > 0) {
  alert('Please fix the following errors:\n\n' + errors.join('\n'));
  return;
}

// REPLACE:
if (errors.length > 0) {
  await AlertModal(
    'Please fix the following errors:\n\n' + errors.join('\n'),
    'Validation Error'
  );
  return;
}
```

---

### 7. Update Logout Function (2 min)

**Find:**
```javascript
window.logout = function() {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};
```

**Replace:**
```javascript
window.logout = function() {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};
```

---

## 🎯 Pages to Refactor (24 Total)

### Student Pages (8)
- [ ] student-dashboard.js
- [ ] subject-enrollment.js
- [ ] student-grades.js
- [ ] student-payments.js
- [ ] student-documents.js
- [ ] student-schedule.js
- [ ] student-curriculum.js
- [ ] student-profile.js

### Finance Pages (5)
- [ ] finance-dashboard.js
- [ ] finance-payments.js
- [ ] finance-payment-monitoring.js
- [ ] finance-reports.js
- [ ] finance-student-accounts.js

### Admin Pages (11)
- [ ] admin-dashboard.js
- [ ] admin-users.js
- [ ] admin-permissions.js
- [ ] admin-audit-logs.js
- [ ] admin-system-settings.js
- [ ] registrar-dashboard.js
- [ ] registrar-students.js
- [ ] registrar-enrollments.js
- [ ] registrar-curriculum.js
- [ ] registrar-grades.js
- [ ] registrar-reports.js

---

## 📝 Testing Checklist (Per Page)

After refactoring each page, test:

1. **Loading State**
   - [ ] Refresh page - loading overlay appears
   - [ ] Loading message is appropriate

2. **Error Handling**
   - [ ] Disconnect network - error toast appears
   - [ ] Error message is context-aware
   - [ ] 401 error redirects to login

3. **Success Feedback**
   - [ ] Create action - success toast appears
   - [ ] Update action - success toast appears
   - [ ] Delete action - success toast appears

4. **Confirmations**
   - [ ] Delete button shows confirm dialog
   - [ ] Cancel works (no action taken)
   - [ ] Confirm works (action executed)
   - [ ] Danger actions have red button

5. **Alerts**
   - [ ] Validation errors show alert
   - [ ] Info messages show alert

6. **Accessibility**
   - [ ] Tab through modals
   - [ ] Escape closes modals
   - [ ] ARIA labels present
   - [ ] Focus management works

---

## 🚀 Estimated Time Per Page

- **Simple pages** (like registrar-programs): 30-45 min
  - Few API calls
  - Simple modals
  - Basic CRUD

- **Medium pages** (like student-dashboard): 45-60 min
  - Multiple API calls
  - Some complex logic
  - Multiple modals

- **Complex pages** (like subject-enrollment): 60-90 min
  - Many API calls
  - Complex business logic
  - Dynamic content

**Total estimated time for all 24 pages**: 20-25 hours (3-4 days)

---

## 💡 Tips

1. **Work in batches** - Do 3-5 similar pages at once
2. **Test as you go** - Don't wait until the end
3. **Use find & replace** - Most changes are repetitive
4. **Keep the pattern** - Follow registrar-programs.js as reference
5. **Commit often** - Commit after each page is done
6. **Document issues** - Note any page-specific challenges

---

## ⚠️ Edge Cases

### Complex Modals (like subjects with prerequisites)
- Use **hybrid approach** (see registrar-subjects.js)
- Update Toast, ErrorHandler, ConfirmModal only
- Keep existing modal rendering if it has dynamic DOM manipulation

### Pages with Custom Patterns (like semesters with window.app namespace)
- Update imports first
- Replace Toast/ErrorHandler/ConfirmModal
- Keep the namespace pattern intact

### Pages with File Uploads
- ErrorHandler already handles validation errors
- Toast shows upload progress (if implemented)
- Modal can show upload preview

---

## 📊 Progress Tracking

Create a simple checklist in your notes:

```markdown
## Refactoring Progress

### Student Pages (0/8)
- [ ] student-dashboard.js
- [ ] subject-enrollment.js
- [ ] student-grades.js
- [ ] student-payments.js
- [ ] student-documents.js
- [ ] student-schedule.js
- [ ] student-curriculum.js
- [ ] student-profile.js

### Finance Pages (0/5)
- [ ] finance-dashboard.js
- [ ] finance-payments.js
- [ ] finance-payment-monitoring.js
- [ ] finance-reports.js
- [ ] finance-student-accounts.js

### Admin Pages (0/11)
- [ ] admin-dashboard.js
- [ ] admin-users.js
- [ ] admin-permissions.js
- [ ] admin-audit-logs.js
- [ ] admin-system-settings.js
- [ ] registrar-dashboard.js
- [ ] registrar-students.js
- [ ] registrar-enrollments.js
- [ ] registrar-curriculum.js
- [ ] registrar-grades.js
- [ ] registrar-reports.js
```

---

## 🎉 When You're Done

After all 24 pages are refactored:

1. **Test critical workflows**
   - Student enrollment flow
   - Payment processing
   - Grade submission
   - Document upload

2. **Update documentation**
   - Mark all pages as complete
   - Document any deviations from pattern
   - Note any issues found

3. **Celebrate!**
   - You've modernized 27 pages
   - Reduced code duplication by 70%
   - Improved user experience
   - Made the codebase maintainable

---

**Reference Files:**
- [registrar-programs.js](frontend/src/pages/registrar-programs.js) - Full Modal refactor example
- [registrar-subjects.js](frontend/src/pages/registrar-subjects.js) - Hybrid approach example
- [COMPONENT_REFACTORING_PROGRESS.md](COMPONENT_REFACTORING_PROGRESS.md) - Detailed patterns

**Need Help?** Check the completed pages for working examples!
