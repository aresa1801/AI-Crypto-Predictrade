# PREDICTRADE Routing Structure

## Overview

The application uses Next.js 16 App Router with organized folder groups for better maintainability and scalability.

## Folder Structure

```
app/
├── (dashboard)/                    # Dashboard group layout
│   ├── layout.tsx                 # Sidebar + Topbar + Main layout
│   ├── page.tsx                   # Dashboard overview (/dashboard)
│   ├── predictions/
│   │   └── page.tsx              # Predictions detail page
│   ├── risk/
│   │   └── page.tsx              # Risk simulator page
│   ├── backtest/
│   │   └── page.tsx              # Backtest analysis page
│   └── settings/
│       └── page.tsx              # Settings configuration page
├── layout.tsx                     # Root layout
├── page.tsx                       # Home redirect to /dashboard
└── globals.css                    # Global styles
```

## Route Mapping

| URL | Component | Purpose |
|-----|-----------|---------|
| `/` | `app/page.tsx` | Redirects to `/dashboard` |
| `/dashboard` | `app/(dashboard)/page.tsx` | Main dashboard overview |
| `/dashboard/predictions` | `app/(dashboard)/predictions/page.tsx` | Prediction analysis & charts |
| `/dashboard/risk` | `app/(dashboard)/risk/page.tsx` | Risk & scenario simulator |
| `/dashboard/backtest` | `app/(dashboard)/backtest/page.tsx` | Backtest results & analysis |
| `/dashboard/settings` | `app/(dashboard)/settings/page.tsx` | Configuration & settings |

## Navigation Structure

### Sidebar Navigation
- Located in `components/sidebar.tsx`
- Desktop only (hidden on mobile, shown via lg: breakpoint)
- Fixed positioning at 256px (w-64)
- Active state styling with blue highlight and shadow effect
- Icons from Lucide for each menu item

### Mobile Navigation
- Located in `components/mobile-nav.tsx`
- Hamburger menu toggle
- Smooth slide-down animation
- Closes on navigation
- Shows on mobile, hidden on lg: breakpoint

### Topbar
- Located in `components/topbar.tsx`
- Contains breadcrumb navigation
- Theme toggle button
- Notifications and user menu
- Shows on all screen sizes
- Breadcrumbs hidden on mobile, shown on sm: and up

### Breadcrumb Navigation
- Located in `components/ui/breadcrumb-nav.tsx`
- Dynamic generation based on pathname
- Home icon links to dashboard
- Chevron separators between items
- Current page highlighted

## Styling Conventions

### Spacing
```css
/* Consistent padding across all pages */
p-4 md:p-6 lg:p-8    /* Mobile 1rem, Tablet 1.5rem, Desktop 2rem */
```

### Layout
```css
/* Max width container */
max-w-7xl mx-auto

/* Responsive grid */
grid-cols-1 md:grid-cols-2 lg:grid-cols-3+
gap-4 md:gap-6      /* Responsive gap sizing */
```

### Animations
```css
/* Smooth page transitions */
animate-in fade-in duration-300

/* Smooth state transitions */
transition-all duration-200
```

### Cards
```css
/* Consistent card styling */
.card = rounded-lg bg-surface-primary border border-border-color p-4
```

## Layout Composition

### Dashboard Layout (`app/(dashboard)/layout.tsx`)

```
┌─────────────────────────────────────┐
│          Topbar                     │
├─────────────┬───────────────────────┤
│             │                       │
│  Sidebar    │  Page Content         │
│             │  (max-w-7xl center)   │
│             │                       │
│             │  p-4 md:p-6 lg:p-8    │
└─────────────┴───────────────────────┘
```

- **Sidebar**: 256px fixed, desktop only
- **Topbar**: Full width, fixed height
- **Main Content**: Flex grow, with scrollable overflow
- **Max Width**: 1280px centered container

## Active State Highlighting

### Sidebar Items
```tsx
// Active state when pathname matches href
isActive = pathname === href || pathname.startsWith(href + '/')

// Styling
if (isActive) {
  // Blue background with white text and shadow
  bg-accent-blue text-white shadow-lg shadow-accent-blue/20
} else {
  // Subtle hover states
  text-text-secondary hover:text-text-primary hover:bg-surface-secondary
}
```

### Mobile Navigation
- Same active state logic as sidebar
- Menu closes after navigation
- Smooth slide-in animation on open

## Route Transition Effects

### Features
- `useRouter` event listeners for transition detection
- Opacity fade during navigation (75% during transition)
- Page content fade-in animation (`animate-in fade-in duration-300`)
- Smooth transition duration of 300ms

### Implementation
```tsx
useEffect(() => {
  // Listen for route changes
  const handleRouteChange = () => {
    setIsTransitioning(false)
  }
  
  window.addEventListener('popstate', handleRouteChange)
  return () => window.removeEventListener('popstate', handleRouteChange)
}, [])
```

## Responsive Design

### Breakpoints
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md, lg)
- **Desktop**: ≥ 1024px (lg)

### Component Visibility
| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Sidebar | Hidden | Hidden | Visible |
| Mobile Nav | Visible | Visible | Hidden |
| Breadcrumbs (desktop) | Hidden | Visible | Visible |
| Breadcrumbs (mobile) | Visible | Hidden | Hidden |

## Best Practices

### Adding New Routes

1. Create folder structure under `(dashboard)/`
2. Add `page.tsx` with page component
3. Update sidebar navigation items
4. Ensure consistent spacing: `p-4 md:p-6 lg:p-8`
5. Wrap content in `max-w-7xl mx-auto`
6. Add page header with title and description

### Page Template

```tsx
export default function PageName() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
          Page Title
        </h1>
        <p className="text-sm md:text-base text-text-secondary">
          Brief description
        </p>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Your components here */}
      </div>
    </div>
  )
}
```

## Performance Considerations

1. **Sidebar**: Hidden with `display: none` on mobile (doesn't affect DOM)
2. **Mobile Nav**: Only renders toggle on mobile screens
3. **Breadcrumbs**: Dynamic generation with `useMemo`
4. **Route Transitions**: Minimal opacity changes, CSS-based
5. **Layout Shift**: No cumulative layout shift due to fixed sidebar width

## Accessibility

- Sidebar links with proper active aria attributes
- Mobile nav button with `aria-label` and `aria-expanded`
- Breadcrumb navigation with semantic `<nav>` and `aria-label`
- Focus states on interactive elements
- Semantic HTML structure throughout
