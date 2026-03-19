# System Infrastructure Master Flow

Background services and administrative control flows.

## 1. Term & Schedule Management
Core structural management of the academic calendar.

### A. Term Management
```mermaid
graph TD
    Start([Admin Action]) --> TermConfig[Configure Grading Windows]
    TermConfig --> SetActive{Set Active Term?}
    
    SetActive -- "Yes" --> ActivateFlow[Activate Enrollment Flow]
    SetActive -- "Finalize" --> TermLock[Global Registrar-level Term Lock]
    
    TermLock --> CloseWindows[Close Submission Windows]
    CloseWindows --> GenerateINC[Auto-Generate INC for missing grades]
    
    GenerateINC --> End([Term Configuration Applied])
```

### B. Scheduling System
```mermaid
graph TD
    Start([Admin/Registrar]) --> DefineCurriculum[Set Curriculum Subjects]
    DefineCurriculum --> CreateSections[Define Sections per Program/Year]
    
    CreateSections --> AssignSchedules[Set Time & Room per Load]
    AssignSchedules --> AssignInstructor[Assign Faculty Member]
    
    AssignInstructor --> CapacityCheck{Max Student Capacity reached?}
    CapacityCheck -- "Yes" --> ShowWarning[Prevent Further Enrollment]
    CapacityCheck -- "No" --> AllowEnroll[Ready for Student Schedule Picking]
    
    AllowEnroll --> End([Academic Scheduling Complete])
```

---

## 2. Core Services (Audit & Alerts)
System-wide utilities for monitoring and communication.

### A. Audit Logging
```mermaid
graph TD
    Start([System Mutation]) --> CheckLogger[Determine if action needs logging]
    CheckLogger --> CaptureData[Capture Before and After state]
    
    CaptureData --> LogEvent[Record to auditing.AuditLog]
    LogEvent --> Metadata[Associate with User, IP, and Timestamp]
    
    Metadata --> AlertCheck{Is critical alert needed?}
    AlertCheck -- "Critical" --> NotifyAdmin[Alert Administrator for review]
    AlertCheck -- "Standard" --> Archive[Store in Audit History]
    
    NotifyAdmin --> Archive
    Archive --> End([Audit Record Committed])
```

### B. Notification System
```mermaid
graph TD
    Start([System Event]) --> ActionTrigger[User Action or Auto-Task]
    ActionTrigger --> IdentifyRecipient[Determine Recipient Roles]
    
    IdentifyRecipient --> CreateNotification[Generate Notification Record]
    CreateNotification --> SetMeta[Assign Type, Title, and Link URL]
    
    SetMeta --> DeliveryMode{Delivery Status}
    DeliveryMode -- "Unread" --> DashboardIndicator[Show Bell Icon Indicator]
    DeliveryMode -- "Clicked" --> MarkAsRead[Mark as Read & Redirect]
    
    MarkAsRead --> End([Notification Process Complete])
```
