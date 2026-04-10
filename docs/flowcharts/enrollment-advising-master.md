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

## 3. Schedule Selection (The Dynamic Window)
Once advising is approved and the Dean publishes the official schedule, the dynamic picking window opens.

```mermaid
graph TD
    Start([Dean Publishes Schedule]) --> OpenWindow[3-Day Picking Window Opens]
    
    OpenWindow --> WindowStatus{Time Check: <br/> Within 72 Hours?}
    
    WindowStatus -- "YES: Window Open" --> StudentAccess[Student Selects Manually]
    WindowStatus -- "NO: Window Closed" --> AutoAssign[System Auto-Assigns Student]
    
    subgraph StudentAction [Manual Picking Actions]
        Regular[Regular Student] --> SessionSelect[Select AM or PM Session]
        Irregular[Irregular Student] --> CustomSelect[Pick Sections per Subject]
    end
    
    SessionSelect --> BlockAssign[Assign to Session Block]
    CustomSelect --> ConflictCheck[Check Time Conflicts]
    
    BlockAssign --> Finalize[Commit Enrollment: ENROLLED]
    ConflictCheck --> Finalize
    AutoAssign --> Finalize
    
    Finalize --> End([Official Timetable & COR Generated])
```

> [!NOTE]
> **Automatic Assignment**: Students who do not pick their schedule within the 3-day window are automatically assigned to available sections by the system based on their regularity status and session history.
