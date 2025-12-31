# Testing Guide - TODO Item Completion

This guide covers testing for the recently completed TODO items: curriculum management, program management, subject management, and the multi-program subject assignment fix.

## Changes Summary

### 1. Critical API Bug Fix
**File:** `frontend/src/api.js`
- Fixed `post()` method to return parsed JSON instead of raw Response object
- Now consistent with `get()`, `put()`, and `patch()` methods
- **Impact:** Fixes multi-program subject assignment feature

### 2. Django Admin Registrations
**File:** `backend/apps/academics/admin.py`
- Added `CurriculumAdmin` class
- Added `CurriculumSubjectAdmin` class
- **Impact:** Curricula can now be managed through Django admin interface

### 3. Program Management Page
**New Files:**
- `frontend/registrar-programs.html`
- `frontend/src/pages/registrar-programs.js`
- **Impact:** Full CRUD interface for program management

### 4. Navigation Fix
**File:** `frontend/src/config/navigation.js`
- Fixed admin "Programs" link (was pointing to subjects page)
- Added "Programs" to registrar navigation
- **Impact:** Proper navigation to program management page

### 5. Curriculum Validation
**Files:**
- `backend/apps/academics/services.py` - Validation logic
- `backend/apps/academics/views.py` - Validation endpoint
- `frontend/src/pages/registrar-curricula.js` - Validation UI
- **Impact:** Can validate curriculum completeness and get statistics

---

## Prerequisites

Before testing, ensure both servers are running:

```bash
# Terminal 1 - Backend (Django)
cd backend
python manage.py runserver
# Should run on http://localhost:8000

# Terminal 2 - Frontend (Vite)
cd frontend
npm run dev
# Should run on http://localhost:3000
```

---

## Test Plan

### Test 1: Multi-Program Subject Assignment (Critical Fix)

**Purpose:** Verify the API bug fix enables proper multi-program subject assignment

**Steps:**

1. **Navigate to Subject Management**
   - Go to http://localhost:3000/registrar-subjects.html
   - Login as registrar or admin if needed

2. **Create a Multi-Program Subject**
   - Click "Add Subject" button
   - Fill in subject details:
     - Code: `TEST101`
     - Name: `Test Subject`
     - Units: `3`
     - Programs: **Check BOTH BSIT and BSCS** (or any 2 programs)
     - Year Level: `1st Year`
     - Semester: `1st Semester`
   - Click "Add Subject"

3. **Verify Display**
   - ✅ Subject should appear in the table
   - ✅ Program column should show: **"BSIT, BSCS"** (or your selected programs)
   - ✅ No console errors in browser DevTools

4. **Edit Multi-Program Subject**
   - Click "Edit" on the TEST101 subject
   - ✅ Both program checkboxes (BSIT and BSCS) should be **checked**
   - Try unchecking BSCS, leaving only BSIT
   - Click "Save Changes"
   - ✅ Subject should now show only "BSIT" in the program column

5. **Verify API Response**
   - Open Browser DevTools → Network tab
   - Edit the subject again and save
   - Find the POST/PUT request to `/api/v1/academics/manage/subjects/`
   - ✅ Response should include: `"program_codes": ["BSIT"]`
   - ✅ Response should be parsed JSON (not a Response object)

**Expected Result:** ✅ All checkboxes work correctly, multiple programs display properly, API responses are parsed JSON

---

### Test 2: Program Management Page

**Purpose:** Test the new program management interface

**Steps:**

1. **Navigate to Programs**
   - Go to http://localhost:3000/registrar-programs.html
   - OR click "Programs" in navigation (registrar or admin)

2. **View Existing Programs**
   - ✅ Should see program cards with:
     - Program code (e.g., BSIT)
     - Program name (e.g., Bachelor of Science in Information Technology)
     - Duration (e.g., 4 years)
     - Total subjects count
     - Active/Inactive status badge

3. **Create New Program**
   - Click "Add Program" button
   - Fill in form:
     - Code: `BSBA` (must be uppercase)
     - Name: `Bachelor of Science in Business Administration`
     - Description: `Business administration program`
     - Duration: `4 years`
     - Active: ✅ Checked
   - Click "Add Program"
   - ✅ New program should appear in the grid
   - ✅ Toast notification: "Program added successfully"

4. **Edit Program**
   - Click "Edit" on the BSBA program
   - Change duration to `5 years`
   - Click "Save Changes"
   - ✅ Program card should update to show 5 years
   - ✅ Toast notification: "Program updated successfully"

5. **Delete Program**
   - Click "Delete" on the BSBA program
   - ✅ Confirmation dialog should appear
   - Click "OK"
   - ✅ Program should disappear from list
   - ✅ Toast notification: "Program deleted successfully"

6. **Test Validation**
   - Try creating a program with lowercase code: `test`
   - ✅ Should auto-convert to uppercase: `TEST`
   - Try creating a program with empty code
   - ✅ Should show validation error (required field)

**Expected Result:** ✅ Full CRUD operations work, validation works, UI updates correctly

---

### Test 3: Navigation Configuration

**Purpose:** Verify navigation links point to correct pages

**Steps:**

1. **Test Admin Navigation**
   - Login as admin user
   - Check navigation menu
   - ✅ "Programs" link should be present
   - Click "Programs"
   - ✅ Should navigate to `/registrar-programs.html` (NOT `/registrar-subjects.html`)
   - ✅ "Programs" link should be highlighted

2. **Test Registrar Navigation**
   - Login as registrar user
   - Check navigation menu
   - ✅ "Programs" link should be present
   - Click "Programs"
   - ✅ Should navigate to `/registrar-programs.html`

3. **Verify All Navigation Links Work**
   - Dashboard ✅
   - User Management (admin only) ✅
   - Programs ✅
   - Subjects ✅
   - Curricula ✅
   - Semesters ✅
   - Sections ✅
   - Schedule ✅

**Expected Result:** ✅ All navigation links work correctly, no 404 errors

---

### Test 4: Curriculum Validation

**Purpose:** Test curriculum validation feature

**Steps:**

1. **Navigate to Curricula**
   - Go to http://localhost:3000/registrar-curricula.html

2. **View Curriculum Structure**
   - Click on any curriculum to open details
   - Click "View Structure" or similar button
   - ✅ Should see curriculum organized by year/semester

3. **Test Valid Curriculum**
   - Find a curriculum with all subjects properly assigned
   - Click "Validate" button
   - ✅ Toast message: "Curriculum is valid!"
   - ✅ Second toast with statistics: "Total: X subjects, Y units"
   - Open browser console
   - ✅ Should see detailed statistics object

4. **Test Invalid Curriculum (Missing Prerequisites)**
   - Create a curriculum with a subject that has prerequisites
   - DO NOT add the prerequisite to the curriculum
   - Click "Validate" button
   - ✅ Alert dialog should show: "Curriculum Validation Errors"
   - ✅ Should list: "Subject XXX requires YYY but it's not in the curriculum"
   - ✅ Toast: "Found N validation errors"

5. **Test Unit Constraints**
   - Create a semester with less than 12 units
   - Click "Validate"
   - ✅ Should warn: "Year X Semester Y has only Z units (recommended min: 12 units)"

6. **Test Prerequisite Ordering**
   - Add a subject and its prerequisite to curriculum
   - Assign the prerequisite to Year 2, and the subject to Year 1
   - Click "Validate"
   - ✅ Should error: "Prerequisite XXX must be scheduled before YYY"

**Expected Result:** ✅ Validation detects all issues, shows appropriate messages

---

### Test 5: Django Admin Interface

**Purpose:** Verify admin registrations work correctly

**Steps:**

1. **Access Django Admin**
   - Go to http://localhost:8000/admin/
   - Login with superuser credentials

2. **Test Curriculum Admin**
   - Navigate to **Academics → Curricula**
   - ✅ Should see list of all curricula
   - ✅ Columns: Code, Name, Program, Effective Year, Active, Total Subjects
   - Click on a curriculum
   - ✅ Should be able to edit: code, name, description, etc.
   - ✅ Created At and Updated At should be read-only

3. **Test Curriculum Subject Admin**
   - Navigate to **Academics → Curriculum Subjects**
   - ✅ Should see list of all curriculum-subject assignments
   - ✅ Columns: Curriculum, Subject, Year Level, Semester Number, Is Required
   - ✅ Can filter by: Program, Year Level, Semester, Required status
   - ✅ Can search by: Curriculum code, Subject code, Subject title

4. **Test Filters and Search**
   - Use program filter
   - ✅ Should filter curriculum subjects by program
   - Use search box with subject code
   - ✅ Should find matching subjects

**Expected Result:** ✅ Both models appear in admin, all fields editable, filters work

---

## Integration Test: Complete Workflow

**Purpose:** Test the complete workflow from program creation to curriculum validation

**Steps:**

1. **Create a New Program**
   - Go to Programs page
   - Create "BSCS" program (4 years)

2. **Create Subjects for the Program**
   - Go to Subjects page
   - Create `CS101 - Intro to Programming` (3 units, BSCS, Year 1, Sem 1)
   - Create `CS201 - Data Structures` (3 units, BSCS, Year 2, Sem 1)
   - Set CS101 as prerequisite for CS201

3. **Create Shared Subject (Multi-Program)**
   - Create `MATH101 - College Algebra` (3 units)
   - Assign to **both BSIT and BSCS** programs
   - ✅ Should show "BSIT, BSCS" in program column

4. **Create Curriculum**
   - Go to Curricula page
   - Create "BSCS-2024" curriculum for BSCS program

5. **Assign Subjects to Curriculum**
   - View BSCS-2024 curriculum structure
   - Assign CS101 to Year 1, Semester 1
   - Assign CS201 to Year 2, Semester 1
   - Assign MATH101 to Year 1, Semester 1

6. **Validate Curriculum**
   - Click "Validate" button
   - ✅ Should pass validation (CS101 comes before CS201)
   - ✅ Should show total subjects and units

7. **Test Invalid Case**
   - Remove CS101 from curriculum (keep CS201)
   - Click "Validate"
   - ✅ Should error: "Subject CS201 requires CS101 but it's not in the curriculum"

**Expected Result:** ✅ Complete workflow works end-to-end

---

## Regression Testing

**Purpose:** Ensure existing functionality still works

**Tests:**

1. **Subject Creation (Single Program)** ✅
   - Create subject with only one program
   - Should work as before

2. **Curriculum Structure View** ✅
   - View curriculum by year/semester
   - Should display correctly

3. **Section Management** ✅
   - Create sections
   - Should work normally

4. **Schedule Management** ✅
   - Create schedule slots
   - Should work normally

---

## Known Issues / Notes

1. **Validation Modal:** Currently uses `alert()` for validation errors. Could be improved with a custom modal in future.

2. **Statistics Display:** Validation statistics are shown in console. Could add a statistics modal in future.

3. **Line Endings:** Some files may show CRLF warnings in Git due to Windows line endings. This is normal.

---

## Success Criteria

All tests should pass with ✅:

- [ ] Multi-program subjects display correctly
- [ ] Program CRUD operations work
- [ ] Navigation links point to correct pages
- [ ] Curriculum validation detects errors
- [ ] Django admin shows Curriculum models
- [ ] Complete workflow works end-to-end
- [ ] No console errors during normal operation
- [ ] API responses are properly parsed JSON

---

## Troubleshooting

### Issue: "Programs" page shows 404
**Solution:** Clear browser cache and refresh, or check that `registrar-programs.html` exists in `frontend/` directory

### Issue: Validation button doesn't appear
**Solution:** Make sure you've opened a curriculum (clicked on it), not just viewing the list

### Issue: Multi-program checkboxes not working
**Solution:** Check browser console for errors. Ensure API bug fix was applied to `frontend/src/api.js`

### Issue: Django admin doesn't show Curriculum
**Solution:** Restart Django server to reload admin configuration

---

## API Endpoints Reference

For reference, here are the key endpoints being tested:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/academics/manage/programs/` | GET, POST | List/Create programs |
| `/api/v1/academics/manage/programs/{id}/` | GET, PUT, DELETE | Retrieve/Update/Delete program |
| `/api/v1/academics/manage/subjects/` | GET, POST | List/Create subjects |
| `/api/v1/academics/manage/subjects/{id}/` | GET, PUT, DELETE | Retrieve/Update/Delete subject |
| `/api/v1/academics/curricula/` | GET, POST | List/Create curricula |
| `/api/v1/academics/curricula/{id}/validate/` | GET | Validate curriculum |
| `/api/v1/academics/curricula/{id}/structure/` | GET | Get curriculum structure |

---

## Completion Checklist

After completing all tests, verify:

- [x] API bug fix applied and working
- [x] Django admin registrations complete
- [x] Program management page created
- [x] Navigation configuration fixed
- [x] Curriculum validation implemented
- [ ] All manual tests pass
- [ ] No regression issues found
- [ ] Documentation complete (this file)

---

## Next Steps (Optional Improvements)

1. **Create validation results modal** instead of using `alert()`
2. **Add statistics visualization** for curriculum validation
3. **Write automated tests** for backend validation logic
4. **Add program bulk import** from CSV/Excel
5. **Create curriculum comparison view** to compare versions
6. **Add curriculum cloning** to copy from previous version

---

**Testing completed:** ___________
**Tested by:** ___________
**All tests passed:** ☐ Yes ☐ No
**Issues found:** ___________
