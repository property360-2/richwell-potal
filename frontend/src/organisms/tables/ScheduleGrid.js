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
 * Calculate slot duration in 30-minute segments
 */
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 1;
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const startTotal = sH * 60 + sM;
  const endTotal = eH * 60 + eM;
  // Use Math.ceil to handle any slight precision issues
  return Math.max(1, Math.ceil((endTotal - startTotal) / 30));
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

  // Generate 30-minute time slots
  const timeLabels = [];
  for (let h = startHour; h < endHour; h++) {
    timeLabels.push(`${h.toString().padStart(2, '0')}:00`);
    timeLabels.push(`${h.toString().padStart(2, '0')}:30`);
  }

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
      <th class="border border-gray-200 bg-white p-2 text-xs font-bold text-gray-600 w-16 sticky left-0 top-0 z-30">Time</th>
      ${visibleDays.map(d => `
        <th class="border border-gray-200 bg-white/95 backdrop-blur-sm p-2 text-xs font-bold text-gray-600 sticky top-0 z-20">${d.short}</th>
      `).join('')}
    </tr>
  `;

  // Track occupied cells with 30-min precision
  const occupied = {};
  slots.forEach(slot => {
    const duration = calculateDuration(slot.start_time, slot.end_time);
    const [sH, sM] = slot.start_time.split(':').map(Number);
    const startTotal = sH * 60 + sM;

    for (let i = 0; i < duration; i++) {
      const currentTotal = startTotal + (i * 30);
      const h = Math.floor(currentTotal / 60);
      const m = currentTotal % 60;
      const key = `${slot.day}-${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      occupied[key] = slot;
    }
  });

  // Render rows
  const rowsHtml = timeLabels.map((time, index) => {
    const cellsHtml = visibleDays.map(day => {
      const key = `${day.code}-${time}`;
      const slot = occupied[key];

      if (slot) {
        // Robust time matching: normalize slot start time to HH:MM
        const [sH, sM] = slot.start_time.split(':').map(Number);
        const slotStartKey = `${sH.toString().padStart(2, '0')}:${sM.toString().padStart(2, '0')}`;

        if (slotStartKey === time) {
          const duration = calculateDuration(slot.start_time, slot.end_time);
          const color = getSlotColor(slot.subject_code);
          const click = onSlotClick ? `onclick="${onSlotClick}('${slot.id}')"` : '';

          return `
            <td 
              rowspan="${duration}" 
              class="border border-gray-200 p-0 relative ${mode === 'edit' ? 'cursor-pointer' : ''}"
              style="height: ${duration * 3}rem;"
            >
              <div 
                class="${color} border-l-4 h-full p-2 text-[10px] ${mode === 'edit' ? 'cursor-pointer hover:opacity-80' : ''}"
                ${click}
              >
                <div class="font-black truncate uppercase tracking-tighter">${slot.subject_code}</div>
                <div class="opacity-75 truncate text-[9px] font-bold">${slot.subject_title || ''}</div>
                <div class="mt-0.5 font-bold text-gray-600 flex items-center gap-1 whitespace-nowrap">
                  ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}
                </div>
                ${slot.room ? `<div class="mt-0.5 font-black text-blue-600 border border-blue-100 bg-white/50 px-1 rounded inline-block text-[8px]">${slot.room}</div>` : ''}
                ${slot.professor_name ? `<div class="mt-0.5 opacity-75 truncate italic">${slot.professor_name}</div>` : ''}
                ${slot.section ? `<div class="mt-1 font-black text-gray-400 uppercase text-[8px] tracking-widest">${slot.section}</div>` : ''}
              </div>
            </td>
          `;
        }
        // Cell is part of a previous multi-row slot, handled by rowspan
        return '';
      }

      // Empty cell
      const cellClick = mode === 'edit' && onCellClick
        ? `onclick="${onCellClick}('${day.code}', '${time}')"`
        : '';
      const hoverClass = mode === 'edit' ? 'hover:bg-blue-50 cursor-pointer' : '';

      return `<td class="border border-gray-100 h-12 ${hoverClass}" ${cellClick}></td>`;
    }).join('');

    return `
      <tr class="group h-12">
        <td class="border border-gray-200 bg-white p-1 text-[10px] font-bold text-center sticky left-0 z-10 ${time.endsWith(':00') ? 'border-t-gray-300 text-gray-500' : 'text-gray-300 font-medium scale-90'}">
          ${formatTime(time)}
        </td>
        ${cellsHtml}
      </tr>
    `;
  }).join('');

  return `
    <div class="bg-white rounded-2xl shadow-xl border border-gray-100 ${className}">
      <table class="w-full border-collapse table-fixed min-w-[800px]">
        <thead>${headerHtml}</thead>
        <tbody class="divide-y divide-gray-50">${rowsHtml}</tbody>
      </table>
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
