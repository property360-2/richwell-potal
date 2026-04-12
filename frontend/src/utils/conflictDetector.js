/**
 * Utility for detecting time conflicts between academic schedules.
 * Used primarily in Irregular Schedule Selection.
 */

/**
 * Converts a time string (HH:MM) to total minutes from midnight.
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} Minutes since midnight
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Checks if two schedules overlap.
 * @param {Object} sch1 - Schedule object { days: [], start_time: "HH:MM", end_time: "HH:MM" }
 * @param {Object} sch2 - Schedule object
 * @returns {boolean} True if they conflict
 */
export const isConflict = (sch1, sch2) => {
  if (!sch1 || !sch2) return false;
  if (!sch1.start_time || !sch1.end_time || !sch2.start_time || !sch2.end_time) return false;

  // Check for common days
  const commonDays = sch1.days.filter(day => sch2.days.includes(day));
  if (commonDays.length === 0) return false;

  // Check for time overlap
  const start1 = timeToMinutes(sch1.start_time);
  const end1 = timeToMinutes(sch1.end_time);
  const start2 = timeToMinutes(sch2.start_time);
  const end2 = timeToMinutes(sch2.end_time);

  return start1 < end2 && start2 < end1;
};

/**
 * Checks if a candidate section has conflicts with a set of already selected sections.
 * @param {Object} candidateSchedules - List of schedules for the candidate subject/section
 * @param {Object} selectedSchedulesBySubject - Map of subjectId -> List of schedules for selected section
 * @param {number} currentSubjectId - ID of the subject we are currently picking for (to exclude self)
 * @returns {Object|null} The first conflict found { subject: string, section: string } or null
 */
export const getScheduleConflict = (candidateSchedules, selectedSchedulesBySubject, currentSubjectId) => {
  if (!candidateSchedules || candidateSchedules.length === 0) return null;

  for (const [subjectId, selectedSchedules] of Object.entries(selectedSchedulesBySubject)) {
    // Skip checking against the same subject (user is changing their choice for this subject)
    if (Number(subjectId) === Number(currentSubjectId)) continue;
    if (!selectedSchedules) continue;

    for (const candSch of candidateSchedules) {
      for (const selSch of selectedSchedules) {
        if (isConflict(candSch, selSch)) {
          return {
            subjectId,
            conflictingSchedule: selSch
          };
        }
      }
    }
  }

  return null;
};
