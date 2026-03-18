# Data Model Overview

## Core Relationships

```mermaid
erDiagram
    PROGRAM ||--o{ CURRICULUM : "defines"
    CURRICULUM ||--o{ SUBJECT : "contains"
    TERM ||--o{ SECTION : "hosts"
    PROGRAM ||--o{ SECTION : "defines"
    SECTION ||--o{ SCHEDULE : "has"
    SUBJECT ||--o{ SCHEDULE : "placed in"
    STUDENT ||--o{ ENROLLMENT : "has"
    TERM ||--o{ ENROLLMENT : "active in"
    STUDENT ||--o{ GRADE : "is graded"
    SUBJECT ||--o{ GRADE : "for"
    TERM ||--o{ GRADE : "in"
    SECTION ||--o| GRADE : "assigned to"
```

## Key Modules

### Academics
- **Program**: Academic degrees (BSIS, BSAIS).
- **Subject**: Individual courses with units and year levels.

### Students
- **Student**: Profile data (name, idn, type).
- **StudentEnrollment**: Link between student and term; tracks regularity status.

### Scheduling
- **Section**: A group of students in a specific year level and term.
- **Schedule**: A mapping of (Subject, Section, Professor, Room, Time).

### Grades
- **Grade**: Central record for a student's performance in a subject. 
- Tracks `midterm_grade`, `final_grade`, and `resolution_status` for INCs.
