# Richwell Portal - Frontend

A modern, feature-rich student information system built with React, Vite, and TailwindCSS.

## 🚀 Tech Stack

- **React 19** - UI library
- **Vite 7** - Build tool and dev server
- **React Router 7** - Client-side routing
- **TailwindCSS 4** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Axios** - HTTP client

## 📁 Project Structure

```
src/
├── api/                    # API configuration and endpoints
├── components/             # Reusable UI components
│   ├── shared/            # Shared components (Header, SEO, etc.)
│   └── ui/                # UI primitives (Button, Modal, etc.)
├── context/               # React context providers
│   ├── AuthContext.jsx    # Authentication state
│   └── ToastContext.jsx   # Toast notifications
├── pages/                 # Feature-based page organization
│   ├── admin/            # Admin portal
│   │   ├── modals/       # Admin-specific modals
│   │   └── services/     # Admin API services
│   ├── registrar/        # Registrar portal
│   │   ├── curriculum/   # Subject & semester management
│   │   ├── enrollment/   # COR approval
│   │   ├── grades/       # Grade monitoring & finalization
│   │   ├── sections/     # Section management
│   │   ├── students/     # Student masterlist
│   │   └── services/     # Registrar API services
│   ├── professor/        # Professor portal
│   ├── student/          # Student portal
│   ├── cashier/          # Cashier portal
│   ├── admission/        # Admission portal
│   ├── head/             # Department head portal
│   └── auth/             # Login & registration
├── permissions/           # Role-based access control
│   ├── constants.js      # Permission definitions
│   ├── hooks/            # Permission hooks
│   └── components/       # Permission gates
├── utils/                # Utility functions
│   ├── formatters.js     # Date, currency, name formatters
│   └── validators.js     # Form validation
├── App.jsx               # Root component with routing
└── main.jsx              # Application entry point
```

## 🎯 Features

### Role-Based Portals

- **Student Portal** - Enrollment, grades, payments, schedule
- **Professor Portal** - Class management, grade submission
- **Registrar Portal** - Student records, academic catalog, sections
- **Cashier Portal** - Payment processing, SOA generation
- **Admission Portal** - Applicant review and approval
- **Department Head Portal** - Grade approval, reports
- **Admin Portal** - User management, system configuration

### Key Capabilities

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Role-Based Access Control** - Permission system with gates
- ✅ **Responsive Design** - Mobile-first, works on all devices
- ✅ **Real-time Validation** - Form validation with instant feedback
- ✅ **Toast Notifications** - User-friendly success/error messages
- ✅ **SEO Optimized** - Meta tags for all pages
- ✅ **Dark Mode Ready** - Theme support infrastructure
- ✅ **Modular Architecture** - Feature-based organization

## 🛠️ Development

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://127.0.0.1:8000`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server

The dev server runs on `http://localhost:3000` with:
- Hot Module Replacement (HMR)
- API proxy to backend (`/api` → `http://127.0.0.1:8000`)
- Fast refresh for instant updates

## 📝 Code Conventions

### File Naming

- **Components**: PascalCase (e.g., `StudentCard.jsx`)
- **Pages**: PascalCase (e.g., `Masterlist.jsx`, `index.jsx`)
- **Utilities**: camelCase (e.g., `formatters.js`)
- **Services**: PascalCase with Service suffix (e.g., `AdminService.jsx`)

### Import Organization

```javascript
// 1. External dependencies
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal utilities/contexts
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';

// 3. Components
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

// 4. Local imports
import { AdminService } from './services/AdminService';
```

### Component Structure

```jsx
// 1. Imports
import React, { useState, useEffect } from 'react';

// 2. Main component
const MyComponent = () => {
    // 3. Hooks
    const [state, setState] = useState(null);
    
    // 4. Effects
    useEffect(() => {
        // ...
    }, []);
    
    // 5. Event handlers
    const handleClick = () => {
        // ...
    };
    
    // 6. Render
    return (
        <div>
            {/* ... */}
        </div>
    );
};

// 7. Export
export default MyComponent;
```

## 🔐 Permission System

The application uses a comprehensive RBAC system. See [`src/permissions/README.md`](src/permissions/README.md) for details.

### Quick Example

```jsx
import { PermissionGate } from '../permissions/components/PermissionGate';
import { PERMISSIONS } from '../permissions/constants';

function MyComponent() {
    return (
        <PermissionGate permission={PERMISSIONS.STUDENTS_EDIT}>
            <button>Edit Student</button>
        </PermissionGate>
    );
}
```

## 🎨 Styling

### TailwindCSS Utilities

The project uses TailwindCSS 4 with custom design tokens:

- **Colors**: Blue primary, semantic colors for states
- **Spacing**: Consistent 4px grid system
- **Typography**: Font weights from 400-900
- **Borders**: Rounded corners (8px-40px)
- **Shadows**: Layered shadow system

### Common Patterns

```jsx
// Card container
<div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-blue-500/5 p-8">

// Primary button
<button className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all">

// Input field
<input className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-100" />
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📦 Building

```bash
# Production build
npm run build

# The build output will be in the `dist/` directory
```

## 🚢 Deployment

The frontend is a static SPA that can be deployed to:

- **Netlify** - Recommended for automatic deployments
- **Vercel** - Great for React apps
- **GitHub Pages** - Free hosting option
- **Traditional hosting** - Serve the `dist/` folder

### Environment Variables

Create a `.env` file for environment-specific configuration:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## 📚 Documentation

- [Permission System](src/permissions/README.md)
- [API Integration](src/api/README.md)
- [Component Library](src/components/README.md)

## 🤝 Contributing

1. Follow the existing code structure
2. Use the established naming conventions
3. Write clean, readable code
4. Test your changes thoroughly
5. Update documentation as needed

## 📄 License

Proprietary - All rights reserved
