/**
 * ScheduleGrid Organism
 * 
 * Weekly schedule grid showing time slots per day.
 * Consolidates duplicated implementations from registrar-academic, professor-schedule, student-schedule.
 */

import { BaseComponent, SIS } from '../../core/index.js';
import { Icon } from '../../atoms/index.js';

// Constants
export const DAYS = [
  { code: 'MON', name: 'Monday', short: 'Mon' },
  { code: 'TUE', name: 'Tuesday', short: 'Tue' },
  { code: 'WED', name: 'Wednesday', short: 'Wed' },
  { code: 'THU', name: 'Thursday', short: 'Thu' },
  { code: 'FRI', name: 'Friday', short: 'Fri' },
  { code: 'SAT', name: 'Saturday', short: 'Sat' },
  { code: 'SUN', name: 'Sunday', short: 'Sun' }
];

export const TIME_SLOTS = [];
for (let hour = 7; hour <= 21; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
}

const SLOT_COLORS = [
  'bg-blue-100 border-blue-400 text-blue-800',
  'bg-green-100 border-green-400 text-green-800',
  'bg-purple-100 border-purple-400 text-purple-800',
  'bg-orange-100 border-orange-400 text-orange-800',
  'bg-pink-100 border-pink-400 text-pink-800',
  'bg-teal-100 border-teal-400 text-teal-800',
  'bg-indigo-100 border-indigo-400 text-indigo-800',
  'bg-red-100 border-red-400 text-red-800'
];

/**
 * Get color for a slot based on subject code
 */
function getSlotColor(subjectCode, slotId = null) {
  if (!subjectCode) return SLOT_COLORS[0];
  const hash = subjectCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return SLOT_COLORS[hash % SLOT_COLORS.length];
}

/**
 * Format 24h time to 12h
 */
export function formatTime(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}${minutes !== '00' ? ':' + minutes : ''}${ampm}`;
}

/**
 * Calculate slot duration in hours
 */
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 1;
  const start = parseInt(startTime.split(':')[0]);
  const end = parseInt(endTime.split(':')[0]);
  return Math.max(1, end - start);
}

/**
 * Render schedule grid HTML
 */
export function renderScheduleGrid({
  slots = [],           // [{ id, day, start_time, end_time, subject_code, subject_title, room?, professor_name?, section? }]
  mode = 'view',        // 'view' | 'edit'
  showDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  startHour = 7,
  endHour = 21,
  onSlotClick = '',     // Function name
  onCellClick = '',     // Function name for empty cell clicks (edit mode)
  emptyMessage = 'No schedule available',
  className = ''
}) {
  const visibleDays = DAYS.filter(d => showDays.includes(d.code));
  const hours = [];
  for (let h = startHour; h < endHour; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`);
  }

  // Group slots by day
  const slotsByDay = {};
  visibleDays.forEach(d => { slotsByDay[d.code] = []; });
  slots.forEach(slot => {
    if (slotsByDay[slot.day]) {
      slotsByDay[slot.day].push(slot);
    }
  });

  // Check if empty
  const isEmpty = slots.length === 0;

  if (isEmpty) {
    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center ${className}">
        <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          ${Icon('calendar', { size: 'xl', className: 'text-blue-400' })}
        </div>
        <h4 class="text-lg font-bold text-gray-700 mb-2">${emptyMessage}</h4>
        <p class="text-gray-500">Schedule slots will appear here when assigned.</p>
      </div>
    `;
  }

  // Render header
  const headerHtml = `
    <tr>
      <th class="border border-gray-200 bg-gray-100 p-2 text-xs font-bold text-gray-600 w-16">Time</th>
      ${visibleDays.map(d => `
        <th class="border border-gray-200 bg-gray-100 p-2 text-xs font-bold text-gray-600">${d.short}</th>
      `).join('')}
    </tr>
  `;

  // Track occupied cells
  const occupied = {};
  slots.forEach(slot => {
    const startHr = parseInt(slot.start_time.split(':')[0]);
    const duration = calculateDuration(slot.start_time, slot.end_time);
    for (let h = 0; h < duration; h++) {
      occupied[`${slot.day}-${startHr + h}`] = slot;
    }
  });

  // Render rows
  const rowsHtml = hours.map((time, hourIndex) => {
    const hour = startHour + hourIndex;

    const cellsHtml = visibleDays.map(day => {
      const key = `${day.code}-${hour}`;
      const slot = occupied[key];

      if (slot) {
        const startHr = parseInt(slot.start_time.split(':')[0]);
        // Only render on first row of slot
        if (startHr === hour) {
          const duration = calculateDuration(slot.start_time, slot.end_time);
          const color = getSlotColor(slot.subject_code);
          const click = onSlotClick ? `onclick="${onSlotClick}('${slot.id}')"` : '';

          return `
            <td 
              rowspan="${duration}" 
              class="border border-gray-200 p-0 relative ${mode === 'edit' ? 'cursor-pointer' : ''}"
            >
              <div 
                class="${color} border-l-4 h-full p-2 text-xs ${mode === 'edit' ? 'cursor-pointer hover:opacity-80' : ''}"
                ${click}
              >
                <div class="font-bold truncate">${slot.subject_code}</div>
                <div class="text-[10px] opacity-75 truncate">${slot.subject_title || ''}</div>
                <div class="text-[10px] mt-1">
                  ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}
                </div>
                ${slot.room ? `<div class="text-[10px] opacity-75">${slot.room}</div>` : ''}
                ${slot.professor_name ? `<div class="text-[10px] opacity-75 truncate">${slot.professor_name}</div>` : ''}
                ${slot.section ? `<div class="text-[10px] font-medium mt-1">${slot.section}</div>` : ''}
              </div>
            </td>
          `;
        }
        // Cell is part of a multi-row slot, skip
        return '';
      }

      // Empty cell
      const cellClick = mode === 'edit' && onCellClick
        ? `onclick="${onCellClick}('${day.code}', '${time}')"`
        : '';
      const hoverClass = mode === 'edit' ? 'hover:bg-blue-50 cursor-pointer' : '';

      return `<td class="border border-gray-200 h-12 ${hoverClass}" ${cellClick}></td>`;
    }).join('');

    return `
      <tr>
        <td class="border border-gray-200 bg-gray-50 p-2 text-xs font-medium text-gray-600 text-center">${formatTime(time)}</td>
        ${cellsHtml}
      </tr>
    `;
  }).join('');

  return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>${headerHtml}</thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `.trim();
}

/**
 * ScheduleGrid Component Class
 */
export class ScheduleGrid extends BaseComponent {
  init() {
    this.state = {
      slots: this.props.slots || [],
      selectedSlot: null
    };

    const id = this.el.id || `schedulegrid-${Date.now()}`;
    this.el.id = id;
    window[`${id}_slotClick`] = this.handleSlotClick.bind(this);
    window[`${id}_cellClick`] = this.handleCellClick.bind(this);

    this.render();
  }

  render() {
    this.el.innerHTML = renderScheduleGrid({
      ...this.props,
      slots: this.state.slots,
      onSlotClick: `${this.el.id}_slotClick`,
      onCellClick: this.props.mode === 'edit' ? `${this.el.id}_cellClick` : ''
    });
  }

  handleSlotClick(slotId) {
    const slot = this.state.slots.find(s => String(s.id) === String(slotId));
    this.state.selectedSlot = slot;
    this.emit('slotClick', { slot });
  }

  handleCellClick(day, time) {
    this.emit('cellClick', { day, time });
  }

  setSlots(slots) {
    this.state.slots = slots;
    this.render();
  }

  addSlot(slot) {
    this.state.slots.push(slot);
    this.render();
  }

  removeSlot(slotId) {
    this.state.slots = this.state.slots.filter(s => String(s.id) !== String(slotId));
    this.render();
  }

  updateSlot(slotId, updates) {
    const slot = this.state.slots.find(s => String(s.id) === String(slotId));
    if (slot) {
      Object.assign(slot, updates);
      this.render();
    }
  }
}

// Register with SIS
SIS.register('ScheduleGrid', ScheduleGrid);

export default ScheduleGrid;
