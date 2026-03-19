# Automatic Advising Flow (Regular Students)

Process for automatically selecting subjects for students on a standard schedule.

```mermaid
graph TD
    Start([Check Eligibility]) --> CurrentEnrollment{Already PENDING/APPROVED?}
    CurrentEnrollment -- "Yes" --> ShowError[ValidationError: Advising exists]
    CurrentEnrollment -- "No" --> CalcStatus[Calculate Highest Passed Year Level]
    
    CalcStatus --> MatchSubjects[Match Subjects from Curriculum]
    MatchSubjects --> SkipSummer[Exclude Summer Subjects (Semester 'S')]
    
    SkipSummer --> FilterPassed[Skip ALL subjects already Passed or INC]
    FilterPassed --> DetectRetakes[Check for previously Failed/Dropped subjects]
    
    DetectRetakes --> LoopSubjects{Loop: Process each eligible subject}
    LoopSubjects -- "Finished" --> SetPending[Enrollment Advising status: PENDING]
    LoopSubjects -- "Subject" --> CreateGrade[Get or Create Grade Record]
    
    CreateGrade --> SetRetakeFlag[Mark as 'is_retake' if Failed/Dropped before]
    SetRetakeFlag --> LoopSubjects
    
    SetPending --> End([Ready for Program Head Review])
```

#### Backend Reference
- Logic in `AdvisingService.auto_advise_regular`.
- **Summer Subjects**: Explicitly excluded from automatic advising.
- **Failures**: Any previously failed/dropped subject is automatically flagged as a **Retake**.
