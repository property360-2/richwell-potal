# Modular Frontend Architecture Guide

This guide documents the new atomic JavaScript architecture for the SIS frontend.

## Quick Start

```javascript
// Import from the component library
import { SIS, BaseComponent, mountComponents } from './core/index.js';
import { renderButton, renderBadge, Icon } from './atoms/index.js';
import { renderStatCard, SearchBar } from './molecules/index.js';
import { DataTable, ScheduleGrid, Tabs } from './organisms/index.js';
```

## Architecture Overview

```
frontend/src/
├── core/           # Infrastructure
│   ├── SIS.js              # Global namespace & registry
│   ├── BaseComponent.js    # Component base class
│   ├── ComponentFactory.js # Auto-mounting
│   └── EventBus.js         # Cross-component events
│
├── atoms/          # Smallest UI primitives
│   ├── buttons/Button.js
│   ├── badges/Badge.js
│   ├── inputs/Input.js
│   ├── loaders/Spinner.js
│   └── icons/Icon.js
│
├── molecules/      # Simple combinations
│   ├── cards/StatCard.js
│   ├── forms/FormField.js
│   ├── forms/SearchBar.js
│   ├── feedback/Alert.js
│   └── navigation/Breadcrumb.js
│
├── organisms/      # Complex, reusable modules
│   ├── tables/DataTable.js
│   ├── tables/ScheduleGrid.js
│   ├── filters/FilterPanel.js
│   ├── navigation/Tabs.js
│   ├── navigation/Pagination.js
│   ├── layout/PageHeader.js
│   ├── layout/EmptyState.js
│   └── domain/
│       └── payments/PaymentBuckets.js
│
├── templates/      # Page-level compositions
│   └── student/DashboardTemplate.js
│
└── pages/          # Entry points (existing)
```

## Usage Patterns

### 1. Render Function Pattern

Most components export a `render*` function that returns HTML:

```javascript
import { renderButton, renderBadge } from './atoms/index.js';

const html = `
  <div class="flex gap-2">
    ${renderButton({ label: 'Save', variant: 'primary' })}
    ${renderButton({ label: 'Cancel', variant: 'secondary' })}
  </div>
`;
```

### 2. Component Class Pattern

For interactive components, use the class with `data-sis-component`:

```html
<div 
  data-sis-component="DataTable" 
  data-sis-props='{"columns": [...], "data": [...]}'
></div>
```

```javascript
import { SIS, mountComponents } from './core/index.js';
import { DataTable } from './organisms/index.js';

// Register component
SIS.register('DataTable', DataTable);

// Mount all components
mountComponents(document.getElementById('app'));
```

### 3. Hybrid Pattern (Recommended)

Combine static HTML with interactive components:

```javascript
function render() {
  document.getElementById('app').innerHTML = `
    ${renderPageHeader({ title: 'Students' })}
    
    <div id="table-container" 
         data-sis-component="DataTable"
         data-sis-props='${JSON.stringify({
           columns: columns,
           data: students,
           loading: state.loading
         })}'>
    </div>
  `;
  
  mountComponents();
}
```

## Component Reference

### Atoms

#### Button
```javascript
import { renderButton, BUTTON_ICONS } from './atoms/buttons/Button.js';

renderButton({
  label: 'Add Student',
  variant: 'primary',  // primary | secondary | danger | ghost | link
  size: 'md',          // sm | md | lg
  icon: BUTTON_ICONS.plus,
  iconPosition: 'left',
  loading: false,
  disabled: false,
  onClick: 'handleClick()'
});
```

#### Badge
```javascript
import { renderBadge, renderStatusBadge } from './atoms/badges/Badge.js';

// Custom badge
renderBadge({ text: 'New', color: 'green', size: 'sm' });

// Auto-colored status badge
renderStatusBadge('ENROLLED');  // → Green
renderStatusBadge('PENDING');   // → Yellow
renderStatusBadge('FAILED');    // → Red
```

#### Input
```javascript
import { renderTextInput, renderSelectInput, renderSearchInput } from './atoms/inputs/Input.js';

renderTextInput({
  name: 'email',
  label: 'Email Address',
  placeholder: 'Enter email',
  required: true,
  error: 'Invalid email format'
});

renderSelectInput({
  name: 'program',
  label: 'Program',
  options: [
    { value: 'bsit', label: 'BS Information Technology' },
    { value: 'bscs', label: 'BS Computer Science' }
  ],
  value: 'bsit'
});
```

#### Icon
```javascript
import { Icon, ICONS } from './atoms/icons/Icon.js';

// Available icons: plus, minus, close, check, edit, delete, search, filter,
// chevronLeft/Right/Up/Down, arrowLeft/Right, info, warning, error, success,
// user, users, book, calendar, clock, download, refresh, cog, bell, logout, eye, menu

Icon('edit', { size: 'md' });  // Returns SVG string
```

### Molecules

#### StatCard
```javascript
import { renderStatCard, renderStatCardGrid } from './molecules/cards/StatCard.js';

// Single card
renderStatCard({
  label: 'Total Students',
  value: '1,234',
  iconName: 'users',
  color: 'blue',
  trend: { value: '+12%', direction: 'up' }
});

// Grid of cards
renderStatCardGrid([
  { label: 'Students', value: '1234', iconName: 'users', color: 'blue' },
  { label: 'Professors', value: '56', iconName: 'user', color: 'purple' },
  { label: 'Courses', value: '89', iconName: 'book', color: 'green' }
], { columns: 3 });
```

#### SearchBar
```javascript
import { renderSearchBar, SearchBar } from './molecules/forms/SearchBar.js';

// Static
renderSearchBar({
  placeholder: 'Search students...',
  value: state.search,
  onInput: 'handleSearch(this.value)'
});

// Component (with debounce)
<div data-sis-component="SearchBar" data-sis-props='{"placeholder": "Search..."}'></div>
```

#### Alert
```javascript
import { renderAlert, renderBanner } from './molecules/feedback/Alert.js';

renderAlert({
  title: 'Action Required',
  message: 'Please complete enrollment',
  variant: 'warning',  // info | success | warning | danger
  dismissible: true
});

renderBanner({
  message: 'Enrollment period ends tomorrow!',
  variant: 'warning',
  action: { label: 'Enroll Now', onClick: 'navigate()' }
});
```

### Organisms

#### DataTable
```javascript
import { renderDataTable, DataTable, CellRenderers } from './organisms/tables/DataTable.js';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'status', label: 'Status', render: CellRenderers.status },
  { key: 'actions', label: '', align: 'right', 
    render: CellRenderers.actions([
      { icon: 'edit', label: 'Edit', onClick: 'editStudent("{id}")' },
      { icon: 'delete', label: 'Delete', color: 'red', onClick: 'deleteStudent("{id}")' }
    ])
  }
];

renderDataTable({
  columns,
  data: students,
  sortKey: 'name',
  sortDirection: 'asc',
  onSort: 'handleSort',
  onRowClick: 'selectStudent',
  emptyMessage: 'No students found'
});
```

#### ScheduleGrid
```javascript
import { renderScheduleGrid, DAYS, TIME_SLOTS } from './organisms/tables/ScheduleGrid.js';

renderScheduleGrid({
  slots: [
    { id: 1, day: 'MON', start_time: '09:00', end_time: '11:00', 
      subject_code: 'IT101', subject_title: 'Programming', room: 'Lab 1' }
  ],
  mode: 'view',  // 'view' | 'edit'
  showDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  onSlotClick: 'editSlot',
  onCellClick: 'addSlot'  // edit mode only
});
```

#### Tabs
```javascript
import { renderTabs, Tabs } from './organisms/navigation/Tabs.js';

renderTabs({
  tabs: [
    { id: 'programs', label: 'Programs', badge: 12 },
    { id: 'sections', label: 'Sections' },
    { id: 'semesters', label: 'Semesters', disabled: true }
  ],
  activeTab: 'programs',
  variant: 'default',  // 'default' | 'pills' | 'underline'
  onTabChange: 'switchTab'
});
```

#### FilterPanel
```javascript
import { renderFilterPanel } from './organisms/filters/FilterPanel.js';

renderFilterPanel({
  search: { 
    placeholder: 'Search...', 
    value: state.search, 
    onInput: 'handleSearch(this.value)' 
  },
  filters: [
    { type: 'select', name: 'program', value: 'all', 
      options: [{ value: 'all', label: 'All Programs' }, ...programs] },
    { type: 'select', name: 'year', value: '1', 
      options: [{ value: '1', label: 'Year 1' }, ...] }
  ],
  actions: [
    { label: 'Add New', onClick: 'openModal()', icon: BUTTON_ICONS.plus }
  ]
});
```

## Creating New Components

### 1. Create the Render Function

```javascript
// organisms/domain/enrollment/EnrollmentCard.js
export function renderEnrollmentCard({ subject, section, isEnrolled }) {
  return `
    <div class="card">
      <h3>${subject.code}</h3>
      <p>${subject.title}</p>
      ${renderBadge({ text: section.name, color: 'blue' })}
      ${isEnrolled 
        ? renderButton({ label: 'Drop', variant: 'danger' })
        : renderButton({ label: 'Enroll', variant: 'primary' })
      }
    </div>
  `;
}
```

### 2. Create the Component Class (if interactive)

```javascript
export class EnrollmentCard extends BaseComponent {
  init() {
    this.state = { isEnrolled: this.props.isEnrolled };
    this.render();
  }
  
  render() {
    this.el.innerHTML = renderEnrollmentCard({
      ...this.props,
      isEnrolled: this.state.isEnrolled
    });
    this.attachListeners();
  }
  
  attachListeners() {
    this.delegate('click', 'button', this.handleAction);
  }
  
  handleAction(e, btn) {
    this.state.isEnrolled = !this.state.isEnrolled;
    this.render();
    this.emit('change', { isEnrolled: this.state.isEnrolled });
  }
}

SIS.register('EnrollmentCard', EnrollmentCard);
```

### 3. Export from Index

```javascript
// organisms/domain/enrollment/index.js
export { EnrollmentCard, renderEnrollmentCard } from './EnrollmentCard.js';
```

## Migration Guide

### Before (Monolithic)

```javascript
// 6,578 lines in one file
function render() {
  app.innerHTML = `
    <div class="card">
      <table class="...">
        ${programs.map(p => `<tr>...</tr>`).join('')}
      </table>
    </div>
  `;
}
```

### After (Modular)

```javascript
// Main page file (~100 lines)
import { renderDataTable, renderPageHeader, mountComponents } from './lib/index.js';

function render() {
  app.innerHTML = `
    ${renderPageHeader({ title: 'Programs' })}
    ${renderDataTable({ columns, data: programs, onSort: 'handleSort' })}
  `;
  mountComponents();
}
```

## Event Communication

### Within Component
```javascript
this.emit('change', { value: this.state.value });
```

### Parent Listening
```javascript
element.addEventListener('change', (e) => {
  console.log(e.detail.value);
});
```

### Global Events
```javascript
// Emit
SIS.emit('enrollment:updated', { studentId: 123 });

// Listen
SIS.on('enrollment:updated', (e) => {
  console.log(e.detail.studentId);
});
```

## Debug Mode

```javascript
SIS.enableDebug();  // Logs all component mounts and events
```
