# Table Component

## Overview
A highly reusable data table component with support for sorting, loading states, and custom row rendering.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `columns` | Array | Configuration for each column (see below) |
| `data` | Array | The array of objects to display |
| `loading` | Boolean | Shows a spinner if `true` |
| `onRowClick`| Function| Handler for row clicks (makes row hoverable) |
| `emptyMessage`| String | Text to show when `data` is empty |
| `onSort` | Function| Handler for column header clicks |

## Column Configuration
Each object in the `columns` array can have:
- `header`: The text displayed in the header.
- `accessor`: The field name in the data object.
- `render`: (Conditional) A function `(row) => JSX` for custom rendering.
- `sortable`: Boolean.
- `align`: "left", "center", or "right".

## Usage Example
```javascript
const columns = [
  { header: 'IDN', accessor: 'idn', sortable: true },
  { header: 'Name', accessor: 'name', render: (row) => <b>{row.name}</b> },
  { 
    header: 'Status', 
    accessor: 'status',
    render: (row) => <Badge status={row.status} /> 
  }
];

<Table 
  columns={columns} 
  data={students} 
  loading={isLoading} 
  onRowClick={(row) => navigate(`/student/${row.id}`)}
/>
```
