# Modal Component

## Overview
A standardized popup container used for forms, confirmations, and detailed views. It handles "Esc" to close and body scroll locking.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | Boolean | controls visibility |
| `onClose` | Function | callback to close the modal |
| `title` | String | text shown in the header |
| `size` | String | "sm", "md", "lg", or "xl" |
| `footer` | JSX | optional buttons or actions |
| `children` | JSX | the main content |

## Behavior
- **Overlay**: Clicking the darkened background triggers `onClose`.
- **Focus**: Automatically focuses the "Close" button on open for accessibility.
- **Scroll**: Disables parent page scrolling while open.

## Usage Example
```javascript
const [isModalOpen, setIsModalOpen] = useState(false);

<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Add New Course"
  size="lg"
  footer={
    <div className="flex gap-2">
      <Button variant="outline" onClick={close}>Cancel</Button>
      <Button variant="primary" onClick={save}>Save</Button>
    </div>
  }
>
  <CourseForm />
</Modal>
```
