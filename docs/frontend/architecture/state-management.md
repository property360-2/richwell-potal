# State Management Architecture

Richwell Portal's frontend uses a hybrid approach to state management, prioritizing native React hooks and Context API to minimize bundle bloat and external dependencies.

> [!TIP]
> Keep state as local as possible. Do not lift state to Context unless the data is needed by multiple, disconnected components.

## Core Principles

1. **Context API for Global System State**:
   - `AuthContext`: Maintains the user session, profile data, and boolean role checks (`isSuperUser`, `role === 'STUDENT'`).
   - `ThemeContext` (If applicable): Handles visual preferences like Dark Mode.

2. **Local Component State (`useState`, `useReducer`) for UI State**:
   - Forms (like the multi-step `ApplicationWizard`) maintain their own payload internally until submission.
   - Modals (like `ApplicantDetailsModal`) rely on boolean toggles stored in their immediate parent component.

3. **Server State (Data Fetching)**:
   - Data fetched from the API is generally stored in the component that needs it using a custom `useFetch` wrapper.

## Why Not Redux / Zustand?

For a portal of this scale, deeply nested prop drilling is minimal. Most routes are self-contained (e.g., The Grading route doesn't need to know anything about the Admission route). Therefore, a heavy centralized store like Redux creates unnecessary boilerplate.
