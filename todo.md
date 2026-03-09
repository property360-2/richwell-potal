# manual verification Plan — Phase 7: Subject Advising

This plan verifies the subject selection and approval logic for Regular, Irregular, and Transferee students.

---

## 🔵 Step 1: Student Auto-Advising (Regular Student)
- [ ] **Login**: Log in as a **Regular Student** (e.g., IDN `260005`).
- [ ] **Access**: Go to **Subject Advising** (`/student/advising`).
- [ ] **State**: Verify you see the "Ready for Auto-Advising" screen.
- [ ] **Action**: Click "Generate My Subjects".
- [ ] **Verify List**: 
    - [ ] Subjects matching the curriculum year/semester are displayed.
    - [ ] Verify "Total Units" count is correct.
    - [ ] Verify you cannot edit the list once submitted.
- [ ] **Status**: Verify the page shows status: **PENDING**.

---

## 🟡 Step 2: Student Manual Advising (Irregular Student)
- [ ] **Setup**: (Optional) Use a student tagged as `is_regular=False` in the database, or reset a student's enrollment status.
- [ ] **Access**: Go to **Subject Advising** (`/student/advising`).
- [ ] **Verification**: Verify you see the "Available Subjects" search/picker UI.
- [ ] **Selection**:
    - [ ] Select subjects using the checkboxes.
    - [ ] **Unit Limit**: Try picking > 40 units. Verify the "Submit" button is disabled and a red warning appears.
    - [ ] **Prerequisites**: Try picking a subject where you haven't passed the prerequisite. Verify it fails on submission with an error message.
- [ ] **Action**: Submit a valid selection (within unit limits).
- [ ] **Status**: Verify the summary updates to **PENDING**.

---

## 🟢 Step 3: Program Head Approval
- [ ] **Login**: Log in as **PROGRAM_HEAD** or **ADMIN**.
- [ ] **Access**: Go to **Advising Approval** (`/program-head/advising`).
- [ ] **Tabs**:
    - [ ] Check "Regular Students" tab. Click **Review** on a student to see their auto-picked subjects.
    - [ ] Check "Irregular Students" tab. Verify you can see their manual selections.
- [ ] **Rejection Flow**:
    - [ ] Click the red **X** (Reject) on a student.
    - [ ] Verify a modal appears asking for a reason.
    - [ ] Submit rejection and log out.
    - [ ] **Student Re-check**: Log in as that student; verify they see the rejection reason and can re-select.
- [ ] **Approval Flow**:
    - [ ] Click the green **Checkmark** (Approve) on a student.
    - [ ] **Batch Approve**: Go to Regular tab and click "Approve All Regular". Verify the list clears.
- [ ] **Verify State**: In the database/UI, verified students should now have Grade status: `ENROLLED`.

---

## 🟣 Step 4: Registrar Subject Crediting (Transferees)
- [ ] **Login**: Log in as **REGISTRAR** or **ADMIN**.
- [ ] **Access**: Go to **Subject Crediting** (`/registrar/crediting`).
- [ ] **Search**: Type IDN or Name of a transferee student.
- [ ] **Crediting UI**: 
    - [ ] Verify the student's curriculum is displayed as a checklist.
    - [ ] Click **Credit** next to a subject.
    - [ ] Verify it changes to a green "Credited" checkmark instantly.
- [ ] **Integrity**: Log in as that student; verify they can no longer pick that subject in their advising (it is already passed/credited).

---

## ✅ Final Integrity Check
- [ ] **Total Units**: Ensure NO student can bypass the 40-units rule.
- [ ] **Permissions**: Verify a Student cannot access `/program-head/advising`.
- [ ] **Navigation**: Verify the Sidebar highlights the active page correctly.
