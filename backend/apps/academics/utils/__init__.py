"""
Academic utilities package.
"""

from .schedule_validators import (
    ScheduleConflictValidator,
    ProfessorQualificationValidator,
    CurriculumValidator,
    validate_schedule_creation
)

__all__ = [
    'ScheduleConflictValidator',
    'ProfessorQualificationValidator',
    'CurriculumValidator',
    'validate_schedule_creation',
]
