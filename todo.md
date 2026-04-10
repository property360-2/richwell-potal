enrollment flow check (done)
subject advising
 - regular check
 - irregular check
 - transferee check

scheduling

- **Alignment Mechanism**:
  1. **Dean Assignment**: Deans assign schedules, and operations rigorously enforce strict constraints—preventing time overlaps for Rooms, Professors, and Sections. Rooms are matched using capacities (`Room.capacity >= need`).
  2. **Publishing**: Once finalized, schedule is published, automatically notifying 'APPROVED' students.
  3. **Student Picking**: 
     - *Regulars*: Pick a pre-packaged session ('AM' or 'PM'). If full, system assigns alternative and warns.
     - *Irregulars*: Pick specific sections per-subject; algorithm ensures there is strictly no time-overlap among their chosen subject schedules.
- **Verification Plan (To Check Successful Operation)**:
  [ ] **Test Conflict Prevention (Dean)**: Attempt to schedule a Professor, Room, or Section into a slot conflicting with their existing time. Backend must reject it indicating conflict type.
  [ ] **Test Auto Generation (Dean)**: Automatically generate slots for a section using `randomize_section_schedule`; verify that generated items completely dodge availability/overlap grids and max limits.
  [ ] **Test Capacity Handling (Regular Student)**: Exceed the max capacity of an 'AM' section. Try picking it via picking service. Verify auto-redirection to available 'PM' block.
  [ ] **Test Irregular Collision (Irregular Student)**: Try scheduling two subjects resolving to intersecting times. Picking API must reject with overlapping conflict.
emailing on current students sa http://localhost:5173/students 
- lets add monthly commitment if manually added
- lets ask the higher roles if pwede ba na student yung mag edit ng mga information nila sa portal, also admission for adding student manually




