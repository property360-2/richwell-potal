# `<Select />`

A custom select component with searchable and non-searchable modes, using Headless UI for accessibility.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | — | Field label |
| `options` | `Array<{id, name}>` | Yes | — | List of options to display |
| `value` | `object` | No | — | Currently selected option object |
| `onChange` | `(opt) => void` | Yes | — | Callback called on selection |
| `error` | `string` | No | — | Validation error message |
| `searchable` | `boolean` | No | `false` | Enables search filtering |

## Usage
```jsx
<Select
  label="Select Subject"
  options={subjects}
  value={selected}
  onChange={setSelected}
  searchable
/>
```

## Behavior
- Automatically filters options if `searchable` is true.
- Displays error state with red border and message.
- Uses floating-ui for menu positioning.
