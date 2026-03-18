# AuthContext

## Overview
The `AuthContext` is the central state manager for user authentication and authorization across the frontend. It wraps the entire application and ensures that user profile data is available to all components.

## State Variables
| Variable | Type | Description |
|----------|------|-------------|
| `user` | Object | The current user profile (id, username, email, role, etc.) |
| `role` | String | Shortcut for `user.role` (e.g., "ADMIN", "STUDENT") |
| `isAuthenticated` | Boolean | `true` if a user object exists |
| `isLoading` | Boolean | `true` while the system is checking the session or logging in |
| `isSuperUser` | Boolean | `true` if the user has Django superuser status |

## Methods

### `login(credentials)`
- **Parameters**: `{"username": "...", "password": "..."}`
- **Behavior**: Calls the login API, sets the user state, and returns `{ success: true }` or an error message.

### `logout()`
- **Behavior**: Calls the logout API and clears the local state.

### `checkAuth()`
- **Behavior**: Fetches the current user profile from `/api/accounts/auth/me/`. Called on app initialization.

## Usage
```javascript
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, role, logout } = useContext(AuthContext);
  
  if (role === 'STUDENT') {
    return <p>Welcome, student {user.first_name}!</p>;
  }
}
```
