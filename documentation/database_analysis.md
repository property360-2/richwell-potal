# Database Design Analysis

This document provides an analysis of the Richwell Portal database schema, focusing on **Normalization**, **Denormalization strategies**, and general **Improvements**.

## **1. Strengths (Normalization)**

The current schema follows **3rd Normal Form (3NF)** effectively, which ensures data integrity and reduces redundancy.

*   **Separation of Concerns**: User identity (`Auth User`), Student Data (`StudentProfile`), and Employee Data (`ProfessorProfile`) are cleanly separated. This allows a user to potentially have multiple roles without duplicating personal data.
*   **Curriculum Management**: The separation of `Program` -> `Curriculum` -> `CurriculumSubject` -> `Subject` is excellent. It allows for historical curriculum versioning without breaking existing student records.
*   **Enrollment Hierarchy**: The `Enrollment` (Head) -> `SubjectEnrollment` (Items) structure is standard and robust. It correctly separates the concept of "Enrolled in a Term" vs "Enrolled in a Subject".

## **2. Opportunities for Denormalization (Performance)**

While normalization is good for integrity, it can slow down read-heavy operations (like generating reports or dashboards). Here are areas where **controlled denormalization** or **caching** can help:

### **A. Student Statistics**
*   **Current State**: To get a student's `Total Units Earned` or `GWA` (General Weighted Average), the system must query all `SubjectEnrollment` records across all `Enrollments`.
*   **Recommendation**:
    *   Add `total_units_earned` and `gpa_cumulative` to `StudentProfile`.
    *   Update these fields via **Signals** whenever a grade is finalized.
    *   **Benefit**: Instant access to student standing for dashboards and ranking without expensive aggregation queries.

### **B. Section Capacity & Enrollment Counts**
*   **Current State**: `Section.enrolled_count` is a calculated property that counts related `SubjectEnrollment` records.
*   **Recommendation**:
    *   Consider adding an `enrolled_count` integer field to `Section` and `SectionSubject`.
    *   Update it transactionally when specific enrollments are confirmed.
    *   **Benefit**: Prevents the "N+1 query problem" when listing active sections in the enrollment module. Checking `remaining_slots` becomes an O(1) operation instead of a database `COUNT()`.

### **C. Current Enrollment Pointer**
*   **Current State**: To find a student's current enrollment, we query `Enrollment.objects.filter(student=user, semester=current_semester)`.
*   **Recommendation**:
    *   Could add a `current_enrollment` ForeignKey on `StudentProfile` (nullable).
    *   **Benefit**: Faster lookup for the most common operation (checking the active status/enrollment of a logged-in student).

## **3. Structural Improvements & Observations**

### **A. The `Grade` Field (Flexibility vs Math)**
*   **Observation**: `SubjectEnrollment.grade` is a `CharField` to support "INC", "DRP", "5.00".
*   **Recommendation**:
    *   Keep `grade` as `CharField` for display.
    *   **ADD** a `numeric_grade` (DecimalField, nullable) field.
    *   Store "1.00" as `1.0` in `numeric_grade`, and "INC" as `null`.
    *   **Why?**: Calculating GPA becomes a simple SQL `AVG(numeric_grade)` instead of complex Python logic mapping strings to numbers.

### **B. Address and Contact Info**
*   **Observation**: `address` and `contact_number` are simple text fields on `StudentProfile`.
*   **Recommendation**:
    *   If the system needs to support multiple addresses (Permanent vs Current) or emergency contacts, separate tables (`UserAddress`, `UserContact`) would be better.
    *   *However*, for a simple portal, the current flat structure is **preferred** (KISS principle).

### **C. Audit Log Scalability**
*   **Observation**: The `AuditLog` table will grow very fast.
*   **Recommendation**:
    *   Ensure strict **Indexing** on `target_id`, `target_model`, and `timestamp`.
    *   Consider a **Partitioning Strategy** (e.g., partition by Month or Year) if using PostgreSQL, to keep queries fast as history grows.

### **D. Payment Ledger**
*   **Observation**: `MonthlyPaymentBucket` tracks expected vs paid.
*   **Recommendation**:
    *   Consider adding a `PaymentTransaction` model if you need to track *when* and *how* (Cash/Check/Online) a payment was made. Currently, you might know "5000 was paid", but not if it was 2 payments of 2500.
    *   *Correction*: If `AuditLog` tracks `PAYMENT_RECORDED`, that might be sufficient for history, but a dedicated ledger table is usually best practice for finance.

## **4. Conclusion**

The current schema is **solid and well-structured** for a university portal. It handles the complexity of academic policies (prerequisites, curricula, sectioning) very well.

**Top 3 Priorities to Implement:**
1.  **Numeric Grade Field**: For easier analytics/GPA calculation.
2.  **Cached Enrollment Counts**: On `Section` model to speed up the enrollment UI.
3.  **Payment Transactions**: A dedicated ledger table if detailed financial tracking is required.
