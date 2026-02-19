# Database Design Analysis

This document provides an analysis of the Richwell Portal database schema, formatted in tables for easier reading.

## **1. Normalization Strengths (3NF)**

| Feature | Observation | Benefit |
|---|---|---|
| **User Roles** | Clean separation of `User` (Auth), `StudentProfile`, and `ProfessorProfile`. | Allows a single user account to have multiple roles (flexible) without duplicating personal data. |
| **Curriculum** | Hierarchical structure: `Program` → `Curriculum` → `CurriculumSubject` → `Subject`. | Supports historical curriculum versioning. New students get the new curriculum, old students stay on their assigned version without data conflicts. |
| **Enrollment** | Term-based structure: `Enrollment` (Head) → `SubjectEnrollment` (Line Items). | Standard and robust. Correctly separates "Term Enrollment" logic (payment, status) from "Subject Enrollment" logic (grades, credits). |

## **2. Opportunities for Denormalization (Performance)**

| Area | Current State | Recommendation | Benefit/Impact |
|---|---|---|---|
| **Student Stats** | `GWA` and `Total Units` are calculated on-the-fly by querying all past enrollments. | Add `gpa_cumulative` and `total_units_earned` to `StudentProfile`. Update via Signals. | **Major Speedup**: Dashboards load instantly without complex aggregation queries. |
| **Section Slots** | `available_slots` is a calculated property (`capacity - count(enrollments)`). | Add `enrolled_count` (Integer) to `Section` table. Update transactionally. | **Scalability**: Listing 100+ sections becomes O(1) instead of N+1 count queries. |
| **Current Term** | System queries `Enrollment` table to find the active term for a student. | Add `current_enrollment_id` (ForeignKey) to `StudentProfile`. | **Optimization**: Faster lookup for the most frequent operation (checking student status). |

## **3. Structural Improvements & Observations**

| Field/Table | Issue / Observation | Recommendation | Reason |
|---|---|---|---|
| **Numeric Grade** | `grade` is `CharField` (e.g., "1.00", "INC"). Hard to average. | Add `numeric_grade` (Decimal, nullable) column. Store `1.0` for valid grades, `null` for INC/DRP. | Simplifies GPA calculation to a simple SQL `AVG()` instead of complex code logic. |
| **Payment Ledger** | `MonthlyPaymentBucket` only tracks running totals (`paid_amount`). | Consider adding a `PaymentTransaction` table (Date, Amount, Ref#). | Provides a full history of *partial payments* and audit trail for finance. |
| **Audit Log** | `AuditLog` table grows rapidly with `JSONField` payload. | Ensure indexing on `target_id`, `target_model`, `timestamp`. | Essential for maintaining performance as history grows. |
| **Address Info** | `address` is a simple text field. | **Keep as is** (Text Field). | Normalizing address into separate tables is often over-engineering for this scope (KISS principle). |

## **4. Conclusion**

The schema is **solid and production-ready**. The recommended improvements focusing on **Numeric Grades** and **Cached Counts** will significantly improve developer experience and frontend performance.
