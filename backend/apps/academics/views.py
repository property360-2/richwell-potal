"""
Academics views - Re-export hub.

All views are split into domain-specific modules for maintainability.
This file re-exports everything so that urls.py continues to work
with `from . import views`.
"""

# --- Programs, Subjects, Rooms ---
from .views_programs import (  # noqa: F401
    ProgramListView,
    ProgramDetailView,
    SubjectListView,
    SubjectDetailView,
    ProgramViewSet,
    SubjectViewSet,
    RoomViewSet,
)

# --- Sections ---
from .views_sections import (  # noqa: F401
    SectionViewSet,
    SectionSubjectViewSet,
)

# --- Scheduling ---
from .views_scheduling import (  # noqa: F401
    ScheduleSlotViewSet,
    ProfessorConflictCheckView,
    RoomConflictCheckView,
    SectionConflictCheckView,
    AvailabilityView,
    ProfessorScheduleView,
)

# --- Curriculum ---
from .views_curriculum import (  # noqa: F401
    CurriculumVersionDetailView,
    CurriculumViewSet,
)

# --- Professors & Archives ---
from .views_professors import (  # noqa: F401
    ProfessorViewSet,
    ArchiveViewSet,
)
