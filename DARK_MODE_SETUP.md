# Dark Mode Implementation - PREDICTRADE

## Overview
PREDICTRADE has been fully converted to a dark-mode-first application using `next-themes` with Tailwind CSS's `darkMode: 'class'` configuration. All components automatically use the dark theme by default, with no hardcoded light mode colors remaining.

## Key Features

### 1. Default Dark Theme
- **Default Theme**: `dark` (set in `next-themes` ThemeProvider)
- **System Preference**: Disabled (`enableSystem: false`)
- **HTML Setup**: `<html>` element has `dark` class by default
- **Color Scheme**: `color-scheme: dark` set globally

### 2. Color Palette
All colors are defined as CSS custom properties in `/app/globals.css`:

```css
:root {
  --background: #0B0F19;           /* Main dark background */
  --surface-primary: #111827;       /* Primary surface/cards */
  --surface-secondary: #1A202C;     /* Secondary surface */
  --text-primary: #F3F4F6;          /* Primary text */
  --text-secondary: #9CA3AF;        /* Secondary text (muted) */
  --border-color: #2D3748;          /* Borders */
  --accent-blue: #3B82F6;           /* Primary accent */
  --accent-emerald: #10B981;        /* Success/up */
  --accent-amber: #F59E0B;          /* Warning */
  --accent-red: #EF4444;            /* Danger/down */
}
```

### 3. Tailwind Configuration
All Tailwind color classes use CSS variable references:

```typescript
colors: {
  background: 'var(--background)',
  foreground: 'var(--text-primary)',
  'surface-primary': 'var(--surface-primary)',
  'surface-secondary': 'var(--surface-secondary)',
  'text-primary': 'var(--text-primary)',
  'text-secondary': 'var(--text-secondary)',
  'accent-blue': 'var(--accent-blue)',
  'accent-emerald': 'var(--accent-emerald)',
  'accent-amber': 'var(--accent-amber)',
  'accent-red': 'var(--accent-red)',
  'border-color': 'var(--border-color)',
}
```

### 4. Theme Toggle Component
A theme toggle button has been added to the topbar (`/components/theme-toggle.tsx`):
- Shows Sun icon in dark mode (click to switch to light)
- Shows Moon icon in light mode (click to switch to dark)
- Handles hydration mismatch with `mounted` state
- Default remains dark on page load

### 5. No Hardcoded Colors
All color references have been replaced with CSS variables:
- **Charts (Recharts)**: All stroke/fill values use `var(--*)`
- **SVG Elements**: Circle backgrounds and strokes use CSS variables
- **Tooltips**: Background colors use `var(--surface-primary)`
- **Components**: All text, background, and border colors use Tailwind classes

## Files Modified

### Core Setup
- ✅ `/app/layout.tsx` - Added ThemeProvider, set dark class on HTML, added `suppressHydrationWarning`
- ✅ `/app/globals.css` - Added CSS custom properties for all colors, dark mode only
- ✅ `/tailwind.config.ts` - Updated all colors to use CSS variables

### Components
- ✅ `/components/theme-toggle.tsx` - New theme toggle component
- ✅ `/components/topbar.tsx` - Added theme toggle button
- ✅ `/components/predictions/prediction-chart.tsx` - Updated all colors to use CSS variables
- ✅ `/components/risk/risk-results.tsx` - Updated all colors to use CSS variables
- ✅ `/components/backtest/backtest-chart.tsx` - Updated all colors to use CSS variables
- ✅ `/components/dashboard/prediction-gauges.tsx` - Updated SVG circle colors

## How It Works

1. **Next.js Root Layout**: Wraps app with `<ThemeProvider>` from next-themes
2. **Default Dark Class**: HTML element has `dark` class by default, overridden by `next-themes` based on user selection
3. **CSS Variables**: All colors are defined in `:root` as CSS custom properties
4. **Tailwind Integration**: Color utilities reference these CSS variables
5. **Theme Toggle**: Clicking the button calls `setTheme('light' | 'dark')`, which next-themes handles by modifying the HTML class

## Storage
Theme preference is stored in `localStorage` with key: `predictrade-theme`
- Persists user's choice across sessions
- Defaults to `dark` if not set

## Extending the Theme

To add new colors:

1. **Add CSS Variable** in `/app/globals.css`:
   ```css
   html {
     --new-color: #HEXCODE;
   }
   ```

2. **Add Tailwind Color** in `/tailwind.config.ts`:
   ```typescript
   colors: {
     'new-color': 'var(--new-color)',
   }
   ```

3. **Use in Components**:
   ```jsx
   <div className="bg-new-color text-new-color">...</div>
   ```

## Testing

- The theme toggle is visible in the topbar
- Default load shows dark mode
- Clicking the toggle switches to light mode (chart grids and borders should adjust)
- Clicking again returns to dark mode
- Refresh page - preference is restored from localStorage

## Notes

- No light mode colors are hardcoded; everything uses CSS variables
- Chart components properly handle theme switching
- All shadcn/ui components automatically inherit dark mode styles
- Hydration mismatch is prevented with `suppressHydrationWarning` on `<html>`
- System preference is ignored in favor of explicit dark default
