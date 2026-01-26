# Academic Data Seeder & Validation System

## Overview

This system provides **model-driven** data seeding and validation for the Richwell Portal academic management system. All code is **strictly based on existing Django models** - no invented fields or models.

## Components

### 1. Comprehensive Data Seeder
**Location:** `apps/academics/management/commands/seed_comprehensive_data.py`

**What it does:**
- Creates realistic test data for the entire academic system
- Validates schedule conflicts during creation
- Ensures professors are only assigned to qualified subjects
- Creates students and enrolls them based on section schedules

**Usage:**
```bash
python manage.py seed_comprehensive_data
```

**What gets created:**
1. **Users:**
   - Admin, Registrar, Department Head, Cashier
   - 5 Professors with different specializations
   - 10 Students (5 per section)

2. **Academic Structure:**
   - 3 Programs (BSIS, BSIT, BSCS)
   - 1 Active Curriculum (BSIS UE 2019)
   - 7 Year 1 Semester 1 Subjects
   - 2 Sections (BSIS-1A, BSIS-1B)

3. **Schedules:**
   - Section schedules with conflict validation
   - Professor assignments based on qualifications
   - Room assignments

4. **Enrollments:**
   - Student profiles with home section assignments
   - Enrollment records for current semester
   - Subject enrollments based on section schedules
   - Payment buckets (first month paid)

### 2. Schedule Validation Utilities
**Location:** `apps/academics/utils/schedule_validators.py`

**Classes:**

#### `ScheduleConflictValidator`
Validates schedule conflicts using the `ScheduleSlot` model.

**Methods:**
- `check_section_conflict()` - Prevents same section from having overlapping classes
- `check_professor_conflict()` - Prevents professor from teaching two classes at once
- `check_room_conflict()` - Prevents double-booking of rooms
- `validate_schedule()` - Comprehensive validation combining all checks

**Example:**
```python
from apps.academics.utils import ScheduleConflictValidator

validator = ScheduleConflictValidator()
result = validator.validate_schedule(
    section_subject=section_subject,
    day='MON',
    start_time=time(9, 0),
    end_time=time(11, 0),
    room='Room 101',
    professor=professor_user
)

if result['is_valid']:
    # Create schedule
    ScheduleSlot.objects.create(...)
else:
    # Handle conflicts
    for error in result['errors']:
        print(error)
```

#### `ProfessorQualificationValidator`
Validates professor qualifications using `ProfessorProfile.assigned_subjects`.

**Methods:**
- `is_qualified(professor, subject)` - Check if professor can teach subject
- `get_qualified_professors(subject)` - Get all professors who can teach a subject
- `get_professor_subjects(professor)` - Get all subjects a professor can teach
- `validate_assignment(professor, subject)` - Validate a professor-subject assignment

**Example:**
```python
from apps.academics.utils import ProfessorQualificationValidator

result = ProfessorQualificationValidator.validate_assignment(
    professor=prof_user,
    subject=subject_obj
)

if result['is_valid']:
    # Assign professor
    section_subject.professor = prof_user
    section_subject.save()
else:
    # Show error
    print(result['message'])
```

#### `CurriculumValidator`
Validates curriculum and section-subject relationships.

**Methods:**
- `validate_section_subject(section, subject)` - Check if subject can be assigned to section
- `get_available_subjects_for_section(section)` - Get subjects valid for a section

**Example:**
```python
from apps.academics.utils import CurriculumValidator

result = CurriculumValidator.validate_section_subject(
    section=section_obj,
    subject=subject_obj
)

if result['is_valid']:
    # Create section-subject link
    SectionSubject.objects.create(...)
else:
    # Show errors
    for error in result['errors']:
        print(error)
```

#### `validate_schedule_creation()` (Convenience Function)
Combines all validations for schedule creation.

**Example:**
```python
from apps.academics.utils import validate_schedule_creation

result = validate_schedule_creation(
    section_subject=section_subject,
    day='TUE',
    start_time=time(13, 0),
    end_time=time(15, 0),
    room='Room 102',
    professor=professor
)

if result['is_valid']:
    # All validations passed
    ScheduleSlot.objects.create(...)
else:
    # Return errors to frontend
    return Response({
        'errors': result['errors'],
        'conflicts': result['schedule_conflicts']
    }, status=400)
```

## Models Used

All validation is based on **existing Django models**:

### From `apps.academics.models`:
- `Program` - Academic programs
- `Subject` - Courses/subjects
- `Curriculum` - Curriculum versions
- `CurriculumSubject` - Subject-curriculum assignments
- `Section` - Student sections
- `SectionSubject` - Section-subject links
- `SectionSubjectProfessor` - Professor assignments (junction table)
- `ScheduleSlot` - Schedule time slots

### From `apps.accounts.models`:
- `User` - All users (students, professors, staff)
- `StudentProfile` - Student-specific data
  - `home_section` field - Links student to their section
- `ProfessorProfile` - Professor-specific data
  - `assigned_subjects` field (ManyToMany) - Qualified subjects

### From `apps.enrollment.models`:
- `Semester` - Academic semesters
- `Enrollment` - Student semester enrollments
- `SubjectEnrollment` - Student-subject enrollments
- `MonthlyPaymentBucket` - Payment tracking

## Validation Rules

### 1. Schedule Conflicts (STRICT)
The system prevents:
- ✅ Same section having overlapping classes
- ✅ Same professor teaching two classes at once
- ✅ Same room being double-booked

### 2. Professor Qualification
- ✅ Professors can only be assigned to subjects in their `assigned_subjects` list
- ⚠️ Warning shown if unqualified professor is assigned (but not blocked)

### 3. Curriculum & Year Level
- ✅ Sections only get subjects from their curriculum
- ✅ Subjects must match section's year level
- ✅ Subjects must match current semester number

### 4. Student Enrollment
- ✅ Students belong to a `home_section`
- ✅ Students are enrolled in all subjects their section offers
- ✅ Enrollment type is automatically set (HOME, RETAKE, OVERLOAD)

## Integration with Views

### Example: Create Schedule Endpoint

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.academics.utils import validate_schedule_creation
from apps.academics.models import SectionSubject, ScheduleSlot

@api_view(['POST'])
def create_schedule(request):
    """Create a new schedule slot with validation."""
    section_subject_id = request.data.get('section_subject_id')
    day = request.data.get('day')
    start_time = request.data.get('start_time')
    end_time = request.data.get('end_time')
    room = request.data.get('room')
    professor_id = request.data.get('professor_id')
    
    # Get objects
    section_subject = SectionSubject.objects.get(id=section_subject_id)
    professor = User.objects.get(id=professor_id) if professor_id else None
    
    # Validate
    result = validate_schedule_creation(
        section_subject, day, start_time, end_time, room, professor
    )
    
    if not result['is_valid']:
        return Response({
            'error': 'Validation failed',
            'errors': result['errors'],
            'conflicts': result['schedule_conflicts']
        }, status=400)
    
    # Create schedule
    schedule = ScheduleSlot.objects.create(
        section_subject=section_subject,
        day=day,
        start_time=start_time,
        end_time=end_time,
        room=room,
        professor=professor
    )
    
    return Response({'id': schedule.id, 'message': 'Schedule created'})
```

## Test Accounts

After running the seeder, you can log in with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@richwell.edu.ph | admin123 |
| Registrar | registrar@richwell.edu.ph | registrar123 |
| Dept Head | head@richwell.edu.ph | head123 |
| Cashier | cashier@richwell.edu.ph | cashier123 |
| Professor | prof.santos@richwell.edu.ph | prof123 |
| Student | student1@richwell.edu.ph | student123 |

## Notes

### What This System Does NOT Do
- ❌ Does not invent new models or fields
- ❌ Does not modify existing model structures
- ❌ Does not create UI components (backend only)

### What This System DOES Do
- ✅ Uses only existing Django models and fields
- ✅ Provides comprehensive validation logic
- ✅ Creates realistic, conflict-free test data
- ✅ Can be integrated into API views
- ✅ Provides clear error messages

### Missing Features (Would Require New Models)
If you need these features, new models/fields would need to be added:

1. **Professor Teaching Load Tracking**
   - Would need: `ProfessorProfile.current_teaching_hours` field
   - Or: New `TeachingLoad` model

2. **Room Capacity Validation**
   - Would need: `Room` model with `capacity` field
   - Currently: Rooms are just strings in `ScheduleSlot.room`

3. **Subject Co-requisites**
   - Would need: `Subject.corequisites` ManyToMany field
   - Currently: Only `prerequisites` exists

4. **Section Capacity Enforcement**
   - Exists: `Section.capacity` field
   - Missing: Automatic validation in enrollment process

## Future Enhancements

To add these features, you would need to:

1. Create/modify models in `apps/academics/models.py`
2. Run migrations
3. Update validators in `schedule_validators.py`
4. Update seeder to populate new fields

All enhancements should follow the same principle: **strictly model-driven, no invented fields**.
