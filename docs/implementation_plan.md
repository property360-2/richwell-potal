# Advising Flow Edge Cases & Proposed Solutions

Based on your scenario: *"A transferee has 1st Year, 1st Sem subjects credited. The active term is 1st Sem. Auto-advise runs, but since they are calculated as 1st Year, it tries to give them 1st Year 1st Sem subjects (which are already credited)."*

This happens because the system defines the student's "Year Level" based on where the majority of their passed subjects are. Since all their passed subjects are 1st Year, the system groups them in 1st Year. Since the active term is 1st Sem, it tries to advise them for 1st Year 1st Sem again.

Here is a comprehensive breakdown of edge cases in the advising flow and how we can solve them.

## 1. The "Out-of-Sync Transferee" (Your Scenario)
**Scenario:** A transferee has all 1st Year 1st Sem subjects credited. The current active term is a 1st Sem. 
**Problem:** `auto_advise_regular` determines they are 1st Year. It fetches 1st Year 1st Sem subjects, finds 0 remaining, and throws our new "No subjects available" error. 
**Real-world expectation:** Because it's the 1st Sem, they should probably be taking **2nd Year 1st Sem** subjects, even if they haven't taken 1st Year 2nd Sem subjects yet (assuming prerequisites are met).
**Proposed Fix:** 
- **Option A (Strict):** Classify any student who skips a semester sequence as **Irregular**. Transferees with incomplete prior years shouldn't use "Auto Advise" at all—they should use **Manual Advising** so they can pick 2nd Year 1st Sem subjects manually.
- **Option B (Smart Auto-Advise):** Modify `auto_advise_regular`. If the system finds 0 subjects for the current year/sem, it should automatically check the *next* year's equivalent semester (e.g., jump from 1st Year 1st Sem to 2nd Year 1st Sem) and auto-advise them for those subjects (filtering out unmet prerequisites).

## 2. Advanced Prerequisite Failures (Irregular Hook)
**Scenario:** A regular student fails a prerequisite subject in 1st Sem. In the 2nd Sem, they try to use Auto Advise.
**Current State:** `check_student_regularity` correctly flags them as Irregular. Auto Advise is blocked.
**Edge Case Issue:** Does the UI clearly tell the student *why* they are Irregular?
**Proposed Fix:** Enhance the `is_regular` endpoint/logic to return a **reason** (e.g., "Failed Prerequisite: IT101", "Missing Back Subject: Math1"). The frontend can display this so the student knows exactly why they must pick subjects manually.

## 3. Total Units Exceeding Maximum on Manual Advising
**Scenario:** An irregular student manually selects subjects. To catch up, they pick 35 units of subjects.
**Current State:** `manual_advise_irregular` throws a validation error if units exceed 30.
**Edge Case Issue:** What if a graduating student needs 32 units to graduate? Usually, registrars have an override.
**Proposed Fix:** Provide an `override_max_units` boolean flag in the manual advise API that only the **Registrar / Program Head** can supply.

## 4. Subject Not Offered in Current Term
**Scenario:** An irregular student needs to retake a 2nd Sem subject, but the active term is 1st Sem.
**Problem:** They manually pick the subject, but technically the school might not offer 2nd Sem subjects in the 1st Sem.
**Proposed Fix:** The `Subject` selection pool in the frontend for manual advising should be filtered based on what is actually *offered* this active term (usually schools map subjects to specific terms). Does Richwell Portal have a "Sections/Subject Offerings" model per term, or can students pick *any* subject? If you have subject offerings per term, we must validate that the selected subjects are actually scheduled for `active_term`.

## 5. Overlapping Schedules (Post-Advising)
**Scenario:** An irregular student gets advised for subjects, but when picking schedules later, the only available sections overlap.
**Problem:** The student has approved advising but mathematically cannot attend the classes.
**Proposed Fix:** This is natural for irregular students. The workflow should allow them to **Drop/Change** an advised subject *during* the scheduling phase if conflicts occur, reverting that subject's advising status.

---

## User Review Required

Of the edge cases above, the most pressing is the out-of-sync transferee. 

**Question:** How do you want to handle the transferee scenario?
1. **Force Manual Advising:** Any out-of-sync transferee must use the Irregular Manual Subject Selection. (This is the easiest and safest to implement).
2. **Smart "Bump Up":** Auto-advise should automatically look forward to 2nd Year, 1st Sem if 1st Year, 1st Sem is fully credited.

Let me know which paths align best with Richwell's academic policies, and I will implement the fixes!
