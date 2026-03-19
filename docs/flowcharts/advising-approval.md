# Advising Approval Flowchart

Program Head review process for planned subjects.

```mermaid
graph TD
    Start([Advising Submitted]) --> PendingList[Program Head Views Pending List]
    PendingList --> ReviewRecord[Review Student Academic Load]
    
    ReviewRecord --> Decision{Decision?}
    Decision -- "Reject" --> RejectAdvising[Staff/Student Notified to Re-submit]
    Decision -- "Approve" --> ApproveAdvising[Set Advising Status to APPROVED]
    
    ApproveAdvising --> SchedUnlock[Unlock "Schedule Picking" for Student]
    SchedUnlock --> NotifyStudent[Notify Student to Pick Schedule]
    
    RejectAdvising --> End([Process Ends])
    NotifyStudent --> End
```
