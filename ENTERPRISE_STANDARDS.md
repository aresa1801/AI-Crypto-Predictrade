# PREDICTRADE Enterprise Standards

## 1. Financial Disclaimer

All pages include a fixed bottom banner with financial disclaimer:
- **Text**: "Bukan saran finansial. Model berbasis probabilitas & data historis. Trade at your own risk."
- **Styling**: `bg-yellow-900/30 text-yellow-200` (warning colors)
- **Behavior**: Dismissible per session using `sessionStorage`
- **Component**: `DisclaimerBanner` in `components/enterprise/disclaimer-banner.tsx`

### Implementation
```tsx
import { DisclaimerBanner } from '@/components/enterprise/disclaimer-banner'

// Add to root layout
<body className="pb-20"> {/* Add padding for banner */}
  {children}
  <DisclaimerBanner />
</body>
```

---

## 2. Accessibility Standards (WCAG 2.1 Level AA)

### 2.1 Semantic HTML & ARIA
All interactive elements must have:
- `aria-label` - Descriptive labels for icon buttons
- `role` - Explicit roles (navigation, button, etc.)
- `aria-expanded` - State for toggles/dropdowns
- `aria-current="page"` - Active navigation indicators
- `aria-hidden="true"` - Hide decorative icons from screen readers

Example:
```tsx
<button
  aria-label="Toggle navigation menu"
  aria-expanded={isOpen}
  aria-controls="mobile-menu"
  className="focus:ring-2 focus:ring-accent-blue"
>
  {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
</button>
```

### 2.2 Keyboard Navigation
- All buttons support Tab, Enter, Space
- Focus rings visible: `focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2`
- Focus traps on modals
- Proper tab order maintained

### 2.3 Focus Management
```tsx
className="focus:outline-none focus:ring-2 focus:ring-accent-blue 
           focus:ring-offset-2 focus:ring-offset-background"
```

---

## 3. CSS Variables & Color System

### 3.1 Tailwind CSS Design Tokens
All colors use Tailwind theme variables instead of hardcoded hex:

**Background Colors**
- `bg-background` - Primary background (#0B0F19)
- `bg-surface-primary` - Primary surface (#111827)
- `bg-surface-secondary` - Secondary surface (#1A202C)

**Text Colors**
- `text-foreground` - Primary text
- `text-text-primary` - Primary text (#F3F4F6)
- `text-text-secondary` - Secondary text (#9CA3AF)

**Accent Colors**
- `text-accent-blue` / `bg-accent-blue` (#3B82F6)
- `text-accent-emerald` / `bg-accent-emerald` (#10B981)
- `text-accent-red` / `bg-accent-red` (#EF4444)
- `text-accent-amber` / `bg-accent-amber` (#F59E0B)

**Border Colors**
- `border-border-color` - Standard borders (#2D3748)
- `border-input` - Input borders

### 3.2 Example: Replace Hardcoded Colors
❌ **Before**
```tsx
className="bg-[#3B82F6] text-white"
```

✅ **After**
```tsx
className="bg-accent-blue text-white"
```

---

## 4. Performance Optimization

### 4.1 React.memo for Heavy Components

Chart and table components use `React.memo` to prevent unnecessary re-renders:

```tsx
// components/charts/enhanced-prediction-chart.tsx
function EnhancedPredictionChartComponent({ asset, data, modelVersion }: Props) {
  // Component logic
}

export const EnhancedPredictionChart = memo(EnhancedPredictionChartComponent)
```

**Memoized Components:**
- `EnhancedPredictionChart`
- `EnhancedBacktestChart`
- Heavy table components

### 4.2 Lazy Loading Charts

Charts below the fold are lazy-loaded using Intersection Observer:

```tsx
// Use in pages
import { LazyChartWrapper } from '@/components/enterprise/lazy-chart-wrapper'
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver'

function MyPage() {
  const { ref, isVisible } = useIntersectionObserver({ threshold: 0.1 })
  
  return (
    <div ref={ref}>
      {isVisible ? (
        <LazyChartWrapper>
          <EnhancedPredictionChart {...props} />
        </LazyChartWrapper>
      ) : (
        <ChartSkeleton />
      )}
    </div>
  )
}
```

### 4.3 Suspense & Fallbacks

All async components have fallback skeletons:

```tsx
<Suspense fallback={<ChartSkeleton height={300} />}>
  <EnhancedChart {...props} />
</Suspense>
```

---

## 5. Console Warnings Prevention

### 5.1 Common Issues & Fixes

**Missing Keys in Lists**
```tsx
❌ {items.map((item) => <div>{item}</div>)}
✅ {items.map((item) => <div key={item.id}>{item}</div>)}
```

**Hydration Mismatches**
```tsx
// Use useEffect for client-only content
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return null
```

**Unknown Props**
```tsx
❌ <input htmlFor="name" /> // htmlFor is for labels
✅ <label htmlFor="name">Name:</label>
```

**Missing aria-labels**
- All icon buttons must have `aria-label`
- All input groups must have associated labels

### 5.2 Validation Checklist
Before deploying, verify:
- [ ] No console errors
- [ ] No console warnings
- [ ] All interactive elements keyboard-accessible
- [ ] All images have alt text (or aria-hidden="true" if decorative)
- [ ] Focus rings visible on all interactive elements
- [ ] No hardcoded hex colors (use CSS variables)

---

## 6. Component Accessibility Examples

### 6.1 Accessible Button Component

```tsx
// components/enterprise/accessible-elements.tsx
import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  ariaLabel: string
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ children, ariaLabel, className = '', ...props }, ref) => (
    <button
      ref={ref}
      aria-label={ariaLabel}
      className={`transition-all duration-200 focus:outline-none focus:ring-2 
                   focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-background ${className}`}
      {...props}
    >
      {children}
    </button>
  )
)
```

### 6.2 Accessible Slider Component

```tsx
// components/inputs/accessible-slider.tsx
<input
  type="range"
  role="slider"
  aria-label="Volatility Multiplier"
  aria-valuenow={value}
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuetext={`${value}x volatility`}
  onChange={(e) => onChange(Number(e.target.value))}
/>
```

---

## 7. Routing & Navigation Standards

### 7.1 App Router Structure
```
app/
├── (dashboard)/
│   ├── layout.tsx          # Sidebar + Topbar
│   ├── page.tsx            # Dashboard overview
│   ├── predictions/page.tsx
│   ├── risk/page.tsx
│   ├── backtest/page.tsx
│   └── settings/page.tsx
├── layout.tsx              # Root layout with DisclaimerBanner
└── page.tsx                # Redirect to /dashboard
```

### 7.2 Breadcrumb Navigation
Dynamic breadcrumbs via `BreadcrumbNav` component:
```tsx
// components/ui/breadcrumb-nav.tsx
<nav aria-label="Breadcrumb">
  <ol>{/* Breadcrumb items */}</ol>
</nav>
```

---

## 8. Code Quality Standards

### 8.1 TypeScript Strict Mode
- No `any` types
- Explicit interfaces for all props
- Proper typing for hooks and utilities

### 8.2 Component Organization
- Keep components under 300 lines
- Extract hooks into `lib/hooks/`
- Extract utilities into `lib/utils/`
- Use descriptive component names

### 8.3 Naming Conventions
- Components: PascalCase (`EnhancedPredictionChart`)
- Files: kebab-case (`enhanced-prediction-chart.tsx`)
- Functions: camelCase (`handleSubmit`)
- Constants: UPPER_SNAKE_CASE (`CHART_COLORS`)

---

## 9. Testing & Validation

### 9.1 Before Production
```bash
# Type checking
npm run type-check

# Build verification
npm run build

# Accessibility audit
# Manual testing with screen readers (NVDA, JAWS)
```

### 9.2 Browser DevTools Checks
- [ ] Lighthouse accessibility audit ≥95
- [ ] No console warnings/errors
- [ ] Keyboard navigation works
- [ ] Focus visible on all interactive elements
- [ ] Responsive on mobile/tablet/desktop

---

## 10. Enterprise Compliance

### 10.1 Financial Regulation
- Disclaimer banner always visible
- Clear risk warnings
- No guarantees or predictions as fact
- Timestamped disclaimers on analysis

### 10.2 Data Security
- No sensitive data in console logs
- No API keys in frontend code
- Secure session management with httpOnly cookies
- Input validation on all forms

### 10.3 Performance SLA
- Lighthouse Score: ≥90
- Core Web Vitals: All green
- First Contentful Paint: <2s
- Time to Interactive: <3.5s

---

## 11. Quick Reference Checklist

- [ ] Disclaimer banner implemented
- [ ] All buttons have aria-label
- [ ] Focus rings visible (ring-2 ring-accent-blue)
- [ ] No hardcoded hex colors
- [ ] Charts memoized with React.memo
- [ ] Lazy loading for below-fold charts
- [ ] Fallback skeletons for async components
- [ ] Zero console warnings
- [ ] Mobile navigation responsive
- [ ] Breadcrumbs dynamic and accessible
- [ ] Sidebar active state highlighted
- [ ] All interactive elements keyboard-accessible
- [ ] Proper tab order maintained
- [ ] Icons marked with aria-hidden="true"
- [ ] Current page indicated with aria-current="page"

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Accessibility](https://tailwindcss.com/docs/responsive-design#accessibility)
- [React.memo Documentation](https://react.dev/reference/react/memo)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
