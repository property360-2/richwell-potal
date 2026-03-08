# manual verification Plan — Phase 6: Student Enrollment lifecycle

Follow these steps to verify the full Student Enrollment Lifecycle, from public application to official enrollment and document verification.

---

## 🟢 Step 1: Public Student Application
- [ ] **Access URL**: Open `http://localhost:5173/apply` in your browser.
- [ ] **Form Rendering**: Verify all fields (Name, DOB, Gender, Municipality, Barangay, Contact, Email, Guardian, Program, Student Type) are present.
- [ ] **Cascading Address**: 
    - [ ] Select a Municipality (e.g., "Malolos").
    - [ ] Verify the Barangay dropdown is enabled and filtered correctly.
- [ ] **Validation Rules**:
    - [ ] Try submitting an empty form (should show errors).
    - [ ] Enter an invalid email or short mobile number (should show errors).
- [ ] **Successful Submission**:
    - [ ] Fill the form correctly and click "Submit Application".
    - [ ] Verify you are redirected to the **Success Page** showing instructions to visit the campus.

---

## 🔵 Step 2: Admission Approval Flow
- [ ] **Login**: Log in with an **ADMISSION** or **ADMIN** account.
- [ ] **Applicants List**: Navigate to **Applicants** (`/admission/applicants`).
- [ ] **Verify Applicant**: Find the applicant you just submitted. Verify their name and program appear correctly.
- [ ] **Document Checklist**: 
    - [ ] Expand the applicant row.
    - [ ] Check a few boxes (e.g., PSA, Form 138) to mark them as "Submitted".
- [ ] **Monthly Commitment**:
    - [ ] Enter a numeric value in the "Monthly Commitment" field (e.g., `2500`).
- [ ] **Approval**:
    - [ ] Click "Approve Student".
    - [ ] **Credential Popup**: Verify a modal appears showing the generated **Student ID (IDN)** and **Default Password**.
    - [ ] **Note IDN**: Copy the IDN for the next step.

---

## 🟣 Step 3: Registrar Document Verification (2nd Layer)
- [ ] **Login**: Log in with a **REGISTRAR** or **ADMIN** account.
- [ ] **Search Student**: Navigate to **Verify Docs** (`/registrar/verification`).
- [ ] **Search functionality**: Type the IDN or Student Name in the search bar. Verify the student appears.
- [ ] **Verify Modal**:
    - [ ] Click "Verify Docs" button.
    - [ ] Verify you see the documents you previously marked as "Submitted" in Admission.
    - [ ] **Verification Logic**: 
        - [ ] Mark a submitted document as "Verified".
        - [ ] Try marking a *non-submitted* document as "Verified" (should be disabled).
- [ ] **Save**: Click "Save Verification". Verify the "Verified" count in the table updates.

---

## 🟡 Step 4: Student Self-Enrollment (Dashboard)
- [ ] **Login**: Log out and log in using the **Student Credentials** (IDN and DOB-based password) generated in Step 2.
- [ ] **Dashboard Redirect**: You should be landed on the **Student Dashboard** (`/student`).
- [ ] **Enrollment Banner**:
    - [ ] Verify you see the "New Term Available" banner with an "Enroll for This Term" button.
- [ ] **Confirmation Flow**:
    - [ ] Click the "Enroll" button.
    - [ ] **Modal**: Verify a modal appears asking for a monthly commitment.
    - [ ] **Submission**: Enter a value and confirm.
- [ ] **Post-Enrollment State**:
    - [ ] Verify the enrollment banner disappears.
    - [ ] Verify the "Current Status" card now shows "Enrolled" in the active term.
    - [ ] Verify that the "Subject Advising" button is now enabled.

---

## ✅ Final Integrity Check
- [ ] **Database Verification**: (Internal) Check the `Student` object status is `ENROLLED` and a `StudentEnrollment` record exists for the active term.
- [ ] **Password Logic**: Confirm you were **NOT** forced to change your password during the first login (as per the latest user request).
