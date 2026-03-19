# Enrollment & Advising Master Flow

This document details the complete flow from subject selection to final enrollment.

## 1. Subject Advising (The "Plan")
Students must first plan their subjects for the term. This can be automatic or manual depending on the student's status.

### A. Automatic Advising (Regular Students)
```mermaid
graph TD
    Start([Check Eligibility]) --> CurrentEnrollment{Already PENDING/APPROVED?}
    CurrentEnrollment -- "Yes" --> ShowError[ValidationError: Advising exists]
    CurrentEnrollment -- "No" --> CalcStatus[Calculate Highest Passed Year Level]
    
    CalcStatus --> MatchSubjects[Match Subjects from Curriculum]
    MatchSubjects --> SkipSummer[Exclude Summer Subjects Semester S]
    
    SkipSummer --> FilterPassed[Skip ALL subjects already Passed or INC]
    FilterPassed --> DetectRetakes[Check for previously Failed/Dropped subjects]
    
    DetectRetakes --> LoopSubjects{Loop: Process each eligible subject}
    LoopSubjects -- "Finished" --> SetPending[Enrollment Advising status: PENDING]
    LoopSubjects -- "Subject" --> CreateGrade[Get or Create Grade Record]
    
    CreateGrade --> SetRetakeFlag[Mark as 'is_retake' if Failed/Dropped before]
    SetRetakeFlag --> LoopSubjects
    
    SetPending --> End([Ready for Program Head Review])
```

### B. Manual Advising (Irregular Students)
```mermaid
graph TD
    Start([Selection Start]) --> AlreadySubmitted{Advising Pending?}
    AlreadySubmitted -- "Yes" --> Error[Show Already Submitted Message]
    AlreadySubmitted -- "No" --> CalcUnits[Calculate Total Selected Units]
    
    CalcUnits --> UnitLimit{Exceeds 30 units?}
    UnitLimit -- "Yes" --> LimitError[Show Unit Limit Error]
    UnitLimit -- "No" --> CheckRules{Loop: Validate each subject}
    
    CheckRules -- "Prerequisite missing" --> RuleError[Show Requirement Error]
    CheckRules -- "Year standing missing" --> RuleError
    CheckRules -- "Group requirement missing" --> RuleError
    CheckRules -- "Passed" --> CreateRecords[Create Grade Records]
    
    CreateRecords --> UpdateStatus[Set Advising status to PENDING]
    UpdateStatus --> End([Ready for Program Head Review])
```

---

## 2. Advising Approval (Staff Review)
Program Heads review the planned subjects before the student can proceed.

```mermaid
graph TD
    Start([Advising Submitted]) --> PendingList[Program Head Views Pending List]
    PendingList --> ReviewRecord[Review Student Academic Load]
    
    ReviewRecord --> Decision{Decision?}
    Decision -- "Reject" --> RejectAdvising[Staff/Student Notified to Re-submit]
    Decision -- "Approve" --> ApproveAdvising[Set Advising Status to APPROVED]
    
    ApproveAdvising --> SchedUnlock[Unlock Schedule Picking for Student]
    SchedUnlock --> NotifyStudent[Notify Student to Pick Schedule]
    
    RejectAdvising --> End([Process Ends])
    NotifyStudent --> End
```

---

## 3. Schedule Picking (The "Execution")
Once approved, students link their subjects to specific classroom sections.

```mermaid
graph TD
    Start([Selection Start]) --> StudentType{Student Type}
    
    StudentType -- "Regular" --> SessionSelect[Select Preferred Session: AM or PM]
    SessionSelect --> CapacityCheck{Session Full?}
    CapacityCheck -- "No" --> AssignBlock[Assign All Sections in Block]
    CapacityCheck -- "Yes" --> Fallback[Assign Alternative Session & Notify]
    
    StudentType -- "Irregular" --> SectionSelect[Manual Section Selection]
    SectionSelect --> ConflictCheck{Time Overlap Detected?}
    ConflictCheck -- "Conflict" --> ShowError[Show Schedule Conflict Error]
    ConflictCheck -- "No Conflict" --> AddToSched[Linked to Section Loads]
    
    AssignBlock --> Finalize[Commit Enrollment: ENROLLED]
    Fallback --> Finalize
    AddToSched --> Finalize
    
    Finalize --> End([Official Timetable Generated])
```
