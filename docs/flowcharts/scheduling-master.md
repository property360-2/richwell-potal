# Scheduling & Publication Master Flow

This document illustrates the administrative workflow for preparing, publishing, and finalizing class schedules.

## The Scheduling Lifecycle

```mermaid
graph TD
    Start([1. Preparation]) --> GenSections[Generate Class Sections <br/> (Registrar/Dean)]
    GenSections --> AssignFaculty[Assign Faculty, Rooms, & Times <br/> (Dean)]
    
    AssignFaculty --> Publish{DEAN ACTION: <br/> Publish Schedule}
    
    Publish -- "Draft Mode" --> Edit[Keep Modifying Loads]
    Publish -- "Published" --> Picking[2. The Picking Window]
    
    subgraph Picking [Dynamic 72-Hour Timer]
        Timer{Is the 3-day <br/> window open?}
        Timer -- "YES" --> Manual[Students Choose Sections <br/> via Portal]
        Timer -- "NO" --> Auto[System Auto-Assigns <br/> Remaining Students]
    end
    
    Manual --> Final[3. Enrollment Locking]
    Auto --> Final
    
    Final --> COR[COR Generation & Official Masterlist]
    COR --> End([Classes Begin])
```

---

## Simple Rules for Faculty

| Phase | What Professors/Deans Need to Know |
| :--- | :--- |
| **Drafting** | The schedule is hidden from students. You can change rooms, times, and faculty without affecting enrollments. |
| **Publication** | Once you click **"Publish"**, a **72-hour (3-day) countdown** begins for all students with approved advising. |
| **Picking Period** | Students use their portal to pick sections (Regulars choose Morning/Afternoon; Irregulars pick subject-by-subject). |
| **Deadline** | After exactly 72 hours, manual picking is **LOCKED**. The system will automatically place any remaining students into available slots. |
| **Finalization** | Once all students have sections, the official Masterlist and Certificate of Registration (COR) are issued. |

> [!IMPORTANT]
> **Dynamic Deadlines**: Unlike previous years with fixed calendar dates, the 3-day window is **automatic**. It moves whenever the Dean decides to publish the schedule, ensuring the system is always responsive to administrative readiness.
