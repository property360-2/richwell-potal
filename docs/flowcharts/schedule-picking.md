# Schedule Picking Flowchart

Process for selecting class sections and managing session loads.

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

#### Backend Reference
- Handled by `PickingService`.
- **Session Fallback**: Regular students who find their preferred session full are automatically moved to the alternative session to ensure enrollment continuity.
