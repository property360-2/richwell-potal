# Phase 3 Testing Guide - Student Enrollment & Payment Processing

## Overview
This guide walks you through testing the complete student enrollment and payment workflow with the newly built UI (Phase 3).

## Test Accounts Created

### Student Accounts
All student accounts have the password: `password123`

| Username | Name | Scenario | Status |
|----------|------|----------|--------|
| seed_freshman | Fresh Freshman Student | First semester, no enrollments | ACTIVE |
| seed_passing | Maria Garcia | Has previous passing grades, ready to enroll | ACTIVE |
| seed_inc | Juan Santos | Has incomplete grades | ACTIVE |
| seed_old_inc | Carlos Rodriguez | Has old incomplete grades | ACTIVE |
| seed_failed | Ana Mendez | Has failed courses | ACTIVE |
| seed_prerequisite | Pedro Lopez | Has prerequisite issues | ACTIVE |
| seed_transfer | Sofia Reyes | Transferee student | ACTIVE |
| seed_low_gpa | Lucia Fernandez | Has low GPA | ACTIVE |

### Cashier Account
**Username:** `cashier`
**Password:** `password123`
**Role:** Cashier (for payment processing)

### Test Administrator
**Username:** `admin`
**Password:** `admin123`
**Role:** Administrator (for system management)

---

## Testing Workflow

### Part 1: Student Login and Dashboard
1. Go to http://localhost:8000/login/
2. Login as any student (e.g., `seed_passing` / `password123`)
3. Click "My Enrollment" in the navbar
4. You should see:
   - **Payment Status**: Current month payment status and outstanding balance
   - **Current Load**: Units enrolled (0 initially, max 30)
   - **Semester Info**: Program, year level, semester name
   - **Currently Enrolled Subjects**: (empty for new students)
   - **Payment History**: (empty initially, populated after payments)
   - **Available Subjects**: List of subjects you can enroll in

### Part 2: Student Enrollment Flow (REQUIRES Month 1 Payment)
1. **Before payment**: Try clicking "Enroll" on any subject
   - You'll see a warning that Month 1 must be paid first
   - Enrollment is disabled until payment is completed

2. **After cashier processes payment**: Enrollments become available
   - Subject enrollment form opens
   - Select subject and optional section
   - Confirm enrollment
   - Subject appears in "Currently Enrolled Subjects"

### Part 3: Cashier Payment Processing
1. Login as cashier (`cashier` / `password123`)
2. Click "Process Payments" in navbar
3. **Search for student**:
   - Enter student ID (e.g., `STU-001`) or name (e.g., `Maria Garcia`)
   - Click Search
   - Results show student info and current balance

4. **Record payment**:
   - Click "Record Payment" button
   - Fill in the form:
     - **Amount**: Enter payment amount (e.g., 5000.00 for Month 1)
     - **Payment Method**: Select Cash, Check, Credit Card, Bank Transfer, or Online
     - **Reference Number**: Enter unique reference (check #, transaction ID, etc.)
     - **Notes**: Optional notes about the payment
   - Click "Record Payment"

5. **View Receipt**:
   - After payment is recorded, you're automatically redirected to the receipt
   - Receipt shows:
     - Receipt number and status
     - Student information
     - Payment details and amount
     - Processed by cashier name
   - Click "Print Receipt" button to print/save as PDF
   - Receipt format is optimized for printing

### Part 4: Student Views Payment History and Receipt
1. Login as the student who received the payment
2. Go to "My Enrollment" dashboard
3. Scroll to **Payment History** section
4. You should see:
   - Payment date and time
   - Amount paid
   - Payment method used
   - Reference number
   - Payment status (COMPLETED)
5. Click "View Receipt" to see the official payment receipt
6. Click "Print Receipt" to print or save as PDF

### Part 5: Student Enrollment After Payment
1. After payment is recorded for Month 1:
2. Go back to student dashboard
3. **Payment Status** should show:
   - Month 1 Payment: PAID ✓
   - The "Available Subjects" section becomes active
4. Click "Enroll" on any subject
5. **Enrollment Form**:
   - Select subject (required) - Radio button selection
   - Select section (optional) - Auto-assign or pick specific section
   - Override schedule conflict (Registrar only)
   - Click "Enroll"
6. Subject is added to **Currently Enrolled Subjects**
7. Total load increases and displays as: "X / 30 units"

### Part 6: Drop Subject
1. In student dashboard, find an enrolled subject in "Currently Enrolled Subjects"
2. Click "Drop" button
3. **Drop Confirmation Form**:
   - Shows subject code, name, and units
   - Reason for dropping (optional)
   - **Confirmation checkbox** - Must check to confirm
   - Click "Confirm Drop" to proceed
4. Subject is removed from enrollment
5. Units are refunded to student load
6. Confirmation message shows units refunded

---

## Key Features Implemented

### Cashier Dashboard
- ✅ Student search by ID or name
- ✅ Quick action cards for reports
- ✅ Responsive design with Richwell color theme
- ✅ Role-based access control (Cashier/Admin only)

### Payment Form
- ✅ Amount validation (must be > 0)
- ✅ Payment method selection
- ✅ Reference number tracking
- ✅ Optional notes field
- ✅ Transaction atomic operations for data consistency

### Payment Receipt
- ✅ Professional receipt format
- ✅ Optimized for printing (with print styles)
- ✅ Shows all payment details
- ✅ Displays processed by cashier info
- ✅ Printable as PDF or paper

### Student Dashboard Enhancements
- ✅ Payment status indicator
- ✅ Month 1 payment gate enforcement
- ✅ Payment history with receipt links
- ✅ Outstanding balance calculation
- ✅ Current load visualization with progress bar
- ✅ Enrolled subjects list with drop option
- ✅ Available subjects for enrollment

### Student Enrollment Form
- ✅ Subject selection with radio buttons
- ✅ Optional section selection
- ✅ Schedule conflict override (Registrar only)
- ✅ Form validation with error messages
- ✅ Prerequisite validation
- ✅ Unit cap enforcement (30 units max)

---

## Business Logic Tested

### Payment Sequential Allocation
- Month 1 must be fully paid before Month 2 receives payments
- Overpayment automatically allocates to next month
- Each payment creates audit trail and receipt

### Payment Gate Enforcement
- Students cannot enroll subjects until Month 1 is paid
- Students cannot sit exams until Month 1 is paid
- Payment status clearly displayed on dashboard

### Unit Cap Enforcement
- Students cannot exceed 30 units per semester
- Progress bar shows current load vs. maximum
- System prevents enrollment that would exceed cap

### Receipt Tracking
- Every payment generates a receipt
- Receipts accessible to student and cashier
- Receipt number uniquely identifies transaction
- All payment details captured

---

## Testing Scenarios

### Scenario 1: Freshman's First Payment and Enrollment
1. Login as `seed_freshman` (no prior history)
2. View dashboard - no enrolled subjects, no payment history
3. Switch to cashier, record 5000 payment for this student
4. Switch back to student
5. Refresh - Month 1 marked as PAID
6. Enroll in CS101 (Programming Fundamentals)
7. Enroll in CS102 (Digital Logic)
8. Total load shows 6/30 units
9. View payment history and print receipt

### Scenario 2: Student with Multiple Payments
1. Login as `seed_passing`
2. Cashier records:
   - Payment 1: 5000 for Month 1
   - Payment 2: 5000 for Month 2
   - Payment 3: 3000 (partial for Month 3)
3. Student dashboard shows payment history with 3 entries
4. Each payment has its own receipt
5. Outstanding balance shows remaining months

### Scenario 3: Drop Subject with Refund
1. Student enrolls in 3 subjects (9 units)
2. Student drops 1 subject (3 units)
3. Load updates from 9/30 to 6/30
4. Drop confirmation shows "Units refunded: 3"
5. Confirmation message displays on redirect

---

## URLs for Quick Access

| Function | URL | User |
|----------|-----|------|
| Student Dashboard | /dashboard/ | Student |
| Enroll Subject | /enroll/ | Student |
| Drop Subject | /drop/{id}/ | Student |
| Cashier Dashboard | /cashier/ | Cashier |
| Record Payment | /payment/{student_id}/ | Cashier |
| View Receipt | /receipt/{payment_id}/ | Student/Cashier |

---

## Troubleshooting

### "You are not a student" error
- Login as student user, not cashier or admin
- Check user's role in database: User.role should be 'STUDENT'

### "No active enrollment found"
- Student must be enrolled in a semester
- Check Enrollment.semester field is populated
- Run seed script to create test enrollments

### Payment not showing in history
- Refresh the page (Django template might be cached)
- Confirm payment was recorded (check database)
- Verify student and enrollment match payment.student and payment.enrollment

### Receipt not printing properly
- Use Chrome or Firefox for best print results
- Adjust print margins in print settings
- Receipt is optimized for A4 paper (8.5" x 11")

### Can't enroll after payment
- Verify Month 1 payment status shows PAID
- Check payment.payment_months[0].is_paid = True
- Logout and login again to refresh cached data

---

## What's Next (Phase 4)

Future enhancements planned:
- [ ] Exam permit generation (unlock after Month 1 payment)
- [ ] Grade viewing and transcript generation
- [ ] Email notifications for payments and enrollments
- [ ] Payment plan setup and installment scheduling
- [ ] Registrar override audit trail
- [ ] Student performance analytics
- [ ] Mobile app for payment processing

---

## Summary

You now have a fully functional student enrollment and payment processing system with:

✅ **Phase 1**: Business logic and validation (100% complete)
✅ **Phase 2**: Grade and payment services (100% complete)
✅ **Phase 3**: Web UI for student enrollment and payment (100% complete)

Test accounts are ready, receipt generation works, and the complete workflow is functional!

For questions or issues, refer to the CLAUDE.md project documentation or check the audit logs in the Django admin panel.
