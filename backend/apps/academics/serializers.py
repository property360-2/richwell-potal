"""
Academics serializers — Re-export hub.

All serializers are split into domain-specific modules for maintainability.
This file re-exports everything so existing imports continue to work.
"""

# --- Programs, Subjects, Rooms ---
from .serializers_programs import (  # noqa: F401
    ProgramMinimalSerializer,
    SubjectMinimalSerializer,
    SubjectSerializer,
    ProgramSerializer,
    ProgramWithSubjectsSerializer,
    RoomSerializer,
    ProgramCreateSerializer,
    SubjectCreateSerializer,
    PrerequisiteSerializer,
)

# --- Sections & Scheduling ---
from .serializers_sections import (  # noqa: F401
    ScheduleSlotSerializer,
    ScheduleSlotCreateSerializer,
    SectionSubjectSerializer,
    SectionSubjectCreateSerializer,
    SectionSerializer,
    SectionCreateSerializer,
    BulkSectionCreateSerializer,
)

# --- Curriculum ---
from .serializers_curriculum import (  # noqa: F401
    CurriculumVersionSerializer,
    CurriculumVersionCreateSerializer,
    CurriculumSerializer,
    CurriculumCreateSerializer,
    CurriculumSubjectSerializer,
    CurriculumSubjectAssignmentSerializer,
    AssignSubjectsSerializer,
    CurriculumStructureSerializer,
)

# --- Professors ---
from .serializers_professors import (  # noqa: F401
    ProfessorProfileSerializer,
    ProfessorSerializer,
    ProfessorDetailSerializer,
    SectionSubjectProfessorSerializer,
)
