# Richwell Portal — Design System

> **Style:** Professional Sleek Minimalism
> **Approach:** Clean, spacious, user-friendly, light-mode-first
> **Philosophy:** Less is more — every element earns its place

---

## Design Direction

The Richwell Portal is an **internal school management system** used by 9 different roles daily. The design must:
- Feel **professional** — this handles real student data, grades, and payments
- Be **instantly readable** — staff process hundreds of records; visual noise = errors
- Be **role-intuitive** — each role lands on a dashboard that makes their job obvious
- Be **fast** — no heavy animations; snappy transitions that don't slow workflows

**Aesthetic:** Clean white canvas + subtle depth + consistent navy-blue accents. Think Apple System Settings meets Stripe Dashboard.

---

## Style: Flat Minimalism + Soft Card Depth

| Property | Value | Why |
|---|---|---|
| Overall Style | Flat Minimalism | Clean, fast, distraction-free |
| Card Style | Subtle shadow + white bg | Depth without heaviness |
| Border Radius | `8px` (cards), `6px` (inputs/buttons), `4px` (badges) | Modern but not playful |
| Shadows | `0 1px 3px rgba(0,0,0,0.08)` (default), `0 4px 12px rgba(0,0,0,0.1)` (elevated) | Depth without drama |
| Borders | `1px solid #E2E8F0` | Subtle structure |
| Spacing Base | `8px` grid system | Mathematical consistency |
| Max Content Width | `1280px` | Readable at all screen sizes |
| Layout | Grid-based, 12-column | Consistent alignment |

### What We Avoid
- ❌ Dark mode (internal tool, office/school lighting — light mode is more readable)
- ❌ Glassmorphism / blur effects (slow on low-end school PCs)
- ❌ Gradients on backgrounds (keeps it professional)
- ❌ Rounded-full cards or bubbly shapes (too playful)
- ❌ Heavy animations (staff workflow speed > visual flair)
- ❌ Emojis as icons (use Lucide React icons consistently)

---

## Color Palette

### Core Colors

| Role | Hex | CSS Variable | Usage |
|---|---|---|---|
| **Primary** | `#2563EB` | `--color-primary` | Main actions, active states, links, selected items |
| **Primary Hover** | `#1D4ED8` | `--color-primary-hover` | Hover on primary buttons |
| **Primary Light** | `#EFF6FF` | `--color-primary-light` | Selected row bg, active tab bg |
| **Secondary** | `#64748B` | `--color-secondary` | Secondary text, subtle actions |
| **Background** | `#F8FAFC` | `--color-bg` | Page background |
| **Surface** | `#FFFFFF` | `--color-surface` | Cards, modals, sidebar |
| **Text Primary** | `#0F172A` | `--color-text` | Headings, body text |
| **Text Secondary** | `#475569` | `--color-text-secondary` | Descriptions, labels |
| **Text Muted** | `#94A3B8` | `--color-text-muted` | Placeholders, timestamps |
| **Border** | `#E2E8F0` | `--color-border` | Card borders, dividers, input borders |
| **Border Focus** | `#2563EB` | `--color-border-focus` | Input focus ring |

### Status Colors

| Status | Hex | CSS Variable | Usage |
|---|---|---|---|
| **Success** | `#16A34A` | `--color-success` | Approved, Passed, Paid, Active |
| **Success Light** | `#F0FDF4` | `--color-success-light` | Success badge bg |
| **Warning** | `#D97706` | `--color-warning` | Pending, INC, Promissory |
| **Warning Light** | `#FFFBEB` | `--color-warning-light` | Warning badge bg |
| **Error** | `#DC2626` | `--color-error` | Rejected, Unpaid, Failed, Error |
| **Error Light** | `#FEF2F2` | `--color-error-light` | Error badge bg |
| **Info** | `#0284C7` | `--color-info` | Informational, In Progress |
| **Info Light** | `#F0F9FF` | `--color-info-light` | Info badge bg |

### Role Colors (Sidebar accent per role)

| Role | Hex | CSS Variable | Usage |
|---|---|---|---|
| Admin | `#7C3AED` | `--color-role-admin` | Sidebar top accent |
| Registrar | `#2563EB` | `--color-role-registrar` | Sidebar top accent |
| Head Registrar | `#1E40AF` | `--color-role-head-registrar` | Sidebar top accent |
| Admission | `#0891B2` | `--color-role-admission` | Sidebar top accent |
| Cashier | `#059669` | `--color-role-cashier` | Sidebar top accent |
| Dean | `#4338CA` | `--color-role-dean` | Sidebar top accent |
| Program Head | `#6D28D9` | `--color-role-programhead` | Sidebar top accent |
| Professor | `#0369A1` | `--color-role-professor` | Sidebar top accent |
| Student | `#2563EB` | `--color-role-student` | Sidebar top accent |

---

## Typography

### Font: Inter (Single family, weight variation)

| Element | Weight | Size | Line Height | Letter Spacing |
|---|---|---|---|---|
| **Page Title (h1)** | 700 (Bold) | `24px` / `1.5rem` | `32px` | `-0.025em` |
| **Section Title (h2)** | 600 (Semibold) | `20px` / `1.25rem` | `28px` | `-0.02em` |
| **Card Title (h3)** | 600 (Semibold) | `16px` / `1rem` | `24px` | `-0.01em` |
| **Subtitle (h4)** | 500 (Medium) | `14px` / `0.875rem` | `20px` | `0` |
| **Body** | 400 (Regular) | `14px` / `0.875rem` | `20px` | `0` |
| **Small / Caption** | 400 (Regular) | `12px` / `0.75rem` | `16px` | `0.01em` |
| **Button Text** | 500 (Medium) | `14px` / `0.875rem` | `20px` | `0.01em` |
| **Badge Text** | 500 (Medium) | `12px` / `0.75rem` | `16px` | `0.02em` |
| **Table Header** | 600 (Semibold) | `12px` / `0.75rem` | `16px` | `0.05em` |

**Why Inter?**
- Designed specifically for computer screens
- Excellent readability at small sizes (tables, badges)
- Wide weight range (300–900)
- Free from Google Fonts
- Used by: GitHub, Figma, Vercel, Linear — all professional tools

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

---

## Component Specifications

### Buttons

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| **Primary** | `#2563EB` | `#FFFFFF` | none | Main actions: Save, Submit, Approve |
| **Primary Hover** | `#1D4ED8` | `#FFFFFF` | none | |
| **Secondary** | `#FFFFFF` | `#374151` | `1px solid #D1D5DB` | Secondary: Cancel, Back |
| **Secondary Hover** | `#F9FAFB` | `#111827` | `1px solid #9CA3AF` | |
| **Danger** | `#DC2626` | `#FFFFFF` | none | Destructive: Reject, Delete |
| **Danger Hover** | `#B91C1C` | `#FFFFFF` | none | |
| **Ghost** | `transparent` | `#2563EB` | none | Inline actions: Edit, View |
| **Ghost Hover** | `#EFF6FF` | `#1D4ED8` | none | |

**Sizes:**
| Size | Padding | Font Size | Height |
|---|---|---|---|
| Small | `6px 12px` | `12px` | `32px` |
| Medium (default) | `8px 16px` | `14px` | `36px` |
| Large | `10px 20px` | `16px` | `40px` |

### Inputs

```
Height: 36px (medium)
Padding: 8px 12px
Border: 1px solid #E2E8F0
Border Radius: 6px
Font Size: 14px
Background: #FFFFFF

Focus: border-color: #2563EB + box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1)
Error: border-color: #DC2626 + box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1)
Disabled: background: #F1F5F9, color: #94A3B8, cursor: not-allowed
```

### Cards

```
Background: #FFFFFF
Border: 1px solid #E2E8F0
Border Radius: 8px
Shadow: 0 1px 3px rgba(0, 0, 0, 0.08)
Padding: 24px

Hover (if clickable): shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
Transition: box-shadow 200ms ease
```

### Badges (Status)

| Status | Background | Text | Border |
|---|---|---|---|
| Success (Approved, Passed, Active, Paid) | `#F0FDF4` | `#166534` | `1px solid #BBF7D0` |
| Warning (Pending, INC, Promissory) | `#FFFBEB` | `#92400E` | `1px solid #FDE68A` |
| Error (Rejected, Retake, Unpaid) | `#FEF2F2` | `#991B1B` | `1px solid #FECACA` |
| Info (Enrolled, In Progress) | `#F0F9FF` | `#075985` | `1px solid #BAE6FD` |
| Neutral (Inactive, Dropped) | `#F8FAFC` | `#475569` | `1px solid #E2E8F0` |

```
Padding: 2px 8px
Border Radius: 4px
Font Size: 12px
Font Weight: 500
Text Transform: none (lowercase looks more modern)
```

### Tables

```
Header:
  Background: #F8FAFC
  Text Color: #64748B
  Font Size: 12px
  Font Weight: 600
  Text Transform: uppercase
  Letter Spacing: 0.05em
  Padding: 12px 16px

Row:
  Background: #FFFFFF
  Border Bottom: 1px solid #F1F5F9
  Padding: 12px 16px
  Font Size: 14px

Row Hover:
  Background: #F8FAFC

Selected Row:
  Background: #EFF6FF
  Border-left: 3px solid #2563EB

Pagination:
  Position: bottom-right of table
  Style: "1 2 3 ... 10" with prev/next arrows
```

### Modal

```
Overlay: rgba(0, 0, 0, 0.4)
Background: #FFFFFF
Border Radius: 12px
Shadow: 0 20px 60px rgba(0, 0, 0, 0.15)
Max Width: 560px (form), 800px (detail), 480px (confirm)
Padding: 24px

Header: 18px semibold, bottom border 1px solid #E2E8F0
Footer: top border, right-aligned buttons with 8px gap
Close Button: top-right X icon, 32x32px hit area
Animation: fade in 150ms + slide up 8px
```

### Toast / Notifications

```
Position: top-right, 16px from edge
Width: 360px
Background: #FFFFFF
Border-left: 4px solid (status color)
Shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
Border Radius: 8px
Padding: 12px 16px
Auto Dismiss: 5 seconds (can be disabled for errors)
Animation: slide in from right 200ms
```

---

## Layout Structure

### Sidebar (Fixed Left)

```
Width: 240px (expanded), 64px (collapsed)
Background: #FFFFFF
Border Right: 1px solid #E2E8F0
Position: fixed left

Top Section:
  Logo + "Richwell Portal" text
  Role color accent bar (4px height, role-specific color)

Menu Items:
  Padding: 8px 16px
  Border Radius: 6px
  Font Size: 14px
  Font Weight: 400 (normal), 500 (active)
  Color: #475569 (normal), #2563EB (active)
  Background: transparent (normal), #EFF6FF (active)
  Icon: 20px, margin-right: 12px (Lucide icons)
  Hover: background #F8FAFC

Bottom Section:
  User avatar (32px circle) + name + role badge
  Logout button
```

### Header (Top Bar)

```
Height: 56px
Background: #FFFFFF
Border Bottom: 1px solid #E2E8F0
Position: sticky top
Padding: 0 24px

Left: Page title (h1, 20px semibold)
Right: Search bar (optional) + Notification bell + User dropdown
```

### Content Area

```
Margin Left: 240px (sidebar width)
Padding Top: 56px (header height)
Padding: 24px
Background: #F8FAFC
Min Height: 100vh
```

### Page Layout Pattern

```
Every page follows this structure:

┌─ Page Header ──────────────────────────────┐
│  h1 Title                    [Action Button] │
│  Subtitle / breadcrumb                       │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─ Stat Cards (if dashboard) ──────────┐   │
│  │ Card 1 │ Card 2 │ Card 3 │ Card 4    │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌─ Filter Bar ────────────────────────┐    │
│  │ Search │ Status Filter │ Date Range  │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌─ Data Table ────────────────────────┐    │
│  │ Header Row                          │    │
│  │ Data Row 1                          │    │
│  │ Data Row 2                          │    │
│  │ Data Row 3                          │    │
│  │                                     │    │
│  │ Pagination                          │    │
│  └─────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Transitions & Micro-Interactions

| Interaction | Duration | Easing | Property |
|---|---|---|---|
| Button hover | `150ms` | `ease` | `background-color, border-color` |
| Card hover | `200ms` | `ease` | `box-shadow` |
| Modal open/close | `150ms` | `ease-out` | `opacity, transform` |
| Toast enter | `200ms` | `ease-out` | `transform (slide-right)` |
| Toast exit | `150ms` | `ease-in` | `opacity` |
| Sidebar collapse | `200ms` | `ease` | `width` |
| Dropdown open | `100ms` | `ease-out` | `opacity, transform (scale-y)` |
| Focus ring | `0ms` | instant | `box-shadow` |
| Loading spinner | infinite | `linear` | `rotation` |

**Rule:** No animation > 300ms. Staff clicks hundreds of buttons per day — snappy = productive.

---

## Icons

**Library:** [Lucide React](https://lucide.dev/) (consistent, MIT licensed, tree-shakeable)

**Icon Sizes:**
| Context | Size | Lucide Prop |
|---|---|---|
| Sidebar menu | `20px` | `size={20}` |
| Button with icon | `16px` | `size={16}` |
| Inline with text | `14px` | `size={14}` |
| Empty state | `48px` | `size={48}` |
| Stat card | `24px` | `size={24}` |

**Color:** Icons inherit text color. Active icons use `--color-primary`.

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Desktop (default) | `≥1280px` | Full sidebar + content |
| Laptop | `1024px–1279px` | Collapsed sidebar (icons only) + content |
| Tablet | `768px–1023px` | Hidden sidebar (hamburger) + full-width content |
| Mobile | `<768px` | Hidden sidebar + stacked cards |

**Note:** Primary target is desktop (school office PCs). Responsive is progressive enhancement, not priority.

---

## CSS Variables Template

```css
:root {
  /* Colors - Core */
  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-primary-light: #EFF6FF;
  --color-secondary: #64748B;
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted: #94A3B8;
  --color-border: #E2E8F0;
  --color-border-focus: #2563EB;

  /* Colors - Status */
  --color-success: #16A34A;
  --color-success-light: #F0FDF4;
  --color-warning: #D97706;
  --color-warning-light: #FFFBEB;
  --color-error: #DC2626;
  --color-error-light: #FEF2F2;
  --color-info: #0284C7;
  --color-info-light: #F0F9FF;

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 0.875rem; /* 14px — compact for data-heavy UI */
  --font-size-lg: 1rem;       /* 16px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */

  /* Spacing (8px grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Border Radius */
  --radius-sm: 4px;   /* badges */
  --radius-md: 6px;   /* buttons, inputs */
  --radius-lg: 8px;   /* cards */
  --radius-xl: 12px;  /* modals */

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 60px rgba(0, 0, 0, 0.15);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;

  /* Layout */
  --sidebar-width: 240px;
  --sidebar-collapsed: 64px;
  --header-height: 56px;
  --content-max-width: 1280px;
}
```

---

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis as icons — all icons from Lucide React
- [ ] Color palette applied consistently (no ad-hoc hex values)
- [ ] All text passes WCAG AA contrast (4.5:1 minimum)
- [ ] Cards have consistent border radius (8px)
- [ ] Spacing follows 8px grid

### Interaction
- [ ] All clickable elements have `cursor: pointer`
- [ ] Hover states on all interactive elements
- [ ] Focus ring visible with keyboard navigation (`0 0 0 3px rgba(37,99,235,0.1)`)
- [ ] Transitions ≤ 300ms
- [ ] Loading spinner shown during API calls

### Layout
- [ ] Sidebar 240px fixed left
- [ ] Header 56px sticky top
- [ ] Content area scrollable
- [ ] No horizontal scroll at any breakpoint
- [ ] Tables responsive (horizontal scroll within table container)

### Accessibility
- [ ] All form inputs have `<label>`
- [ ] All images have `alt` text
- [ ] Color is not the only indicator (always use icon + text + color)
- [ ] `prefers-reduced-motion` respected
- [ ] Tab order logical

---

## Design Inspiration Reference

**The Richwell Portal should feel like:**
- **Linear** (clean sidebar, minimal chrome, fast)
- **Stripe Dashboard** (professional data tables, clear hierarchy)
- **Vercel** (sleek, spacious, Inter font)
- **Notion** (white canvas, subtle borders, focus on content)

**NOT like:**
- Overly colorful classroom tools
- Complex enterprise dashboards with 50 menu items
- Dark hacker-themed admin panels
- Bubbly/playful children's apps
