// Add this code at the end of the refreshLogisticsStatus function, right before the closing brace (line 1367)

// Check for conflicts and disable submit button if needed
const saveBtn = document.getElementById('btn-save-schedule');
const conflictWarning = document.getElementById('conflict-warning');
let hasConflict = false;
let conflictMessages = [];

// Check room conflict
if (roomEl && roomEl.value && busyRooms[roomEl.value]) {
    hasConflict = true;
    const conflict = busyRooms[roomEl.value];
    conflictMessages.push(`Room ${roomEl.value} is already occupied by ${conflict.subject_code} (${conflict.section_name})`);
}

// Check professor conflict
if (profEl && profEl.value && busyProfs[profEl.value]) {
    hasConflict = true;
    const conflict = busyProfs[profEl.value];
    const profName = profEl.options[profEl.selectedIndex]?.getAttribute('data-name') || 'Professor';
    conflictMessages.push(`${profName} is already teaching ${conflict.subject_code} (${conflict.section_name})`);
}

// Update submit button state
if (saveBtn) {
    if (hasConflict) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
        saveBtn.title = 'Cannot save: ' + conflictMessages.join('; ');
    } else {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
        saveBtn.title = '';
    }
}

// Show/hide conflict warning
if (conflictWarning) {
    if (hasConflict) {
        conflictWarning.textContent = '⚠️ SCHEDULE CONFLICT\n\n' + conflictMessages.join('\n\n') + '\n\nPlease select different resources or change the time.';
        conflictWarning.classList.remove('hidden');
    } else {
        conflictWarning.classList.add('hidden');
    }
}
