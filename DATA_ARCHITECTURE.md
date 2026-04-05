# PREDICTRADE Data Architecture

## Overview

All hardcoded values have been replaced with structured mock data and proper TypeScript interfaces. Every component now follows a consistent async data loading pattern with comprehensive state management.

## Directory Structure

```
lib/
├── types.ts              # TypeScript interfaces (CryptoAsset, Prediction, etc.)
├── mock/
│   └── data.ts          # Structured mock data organized by domain
├── hooks/
│   └── useAsync.ts      # Data fetching hook with state management
└── mock-data.ts         # Legacy re-export for backwards compatibility

components/
├── error-boundary.tsx    # Error boundary for error handling
├── empty-state.tsx       # Empty state UI component
├── skeletons/
│   └── index.tsx        # Loading skeleton components
└── [features]/          # Feature components using new patterns
```

## TypeScript Interfaces

All interfaces are explicitly defined in `lib/types.ts` with **zero use of "any" types**:

- **CryptoAsset**: Digital asset information (BTC, ETH, etc.)
- **Prediction**: ML prediction with confidence levels and targets
- **MarketSnapshot**: Market-wide metrics and statistics
- **BacktestResult**: Historical strategy performance data
- **RiskScenario**: Risk simulation results
- **UserSettings**: User configuration preferences

## Data Flow Pattern

Every component follows this pattern:

```
Initial Load → Loading State (Skeleton) → Success (Render Data)
                                       ↘ Error (Empty State + Retry)
```

## Component Implementation

### Example: Market Snapshot Component

```typescript
function MarketSnapshotContent() {
  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'error'
    data: MarketSnapshotData | null
    error: Error | null
  }>({ status: 'loading', data: null, error: null })

  useEffect(() => {
    const loadData = async () => {
      try {
        // Simulate async fetch with 600-1200ms delay
        await new Promise((resolve) => 
          setTimeout(resolve, Math.random() * 600 + 600)
        )
        
        // Fetch and transform data
        setState({
          status: 'success',
          data: { market: mockMarketSnapshot, assets: mockCryptoAssets },
          error: null,
        })
      } catch (error) {
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error : new Error('Failed to load'),
        })
      }
    }

    loadData()
  }, [])

  // Render based on status
  if (state.status === 'loading') return <CardSkeleton />
  if (state.status === 'error') return <ErrorFallback />
  if (!state.data) return null
  
  return <RenderData data={state.data} />
}
```

## State Management

### Four States Per Component

1. **Loading**: Display skeleton placeholder
   - Uses `CardSkeleton`, `TableSkeleton`, or `ChartSkeleton`
   - Smooth transition with animate-pulse

2. **Success**: Render data with proper formatting
   - Display fetched data in appropriate UI
   - All values typed explicitly

3. **Error**: Show error state with retry option
   - Error boundary catches uncaught errors
   - User-friendly error message
   - Retry button to re-fetch data

4. **Empty**: No data available
   - Display `EmptyState` component
   - Icon, title, and description
   - Optional CTA button

## Async Data Loading

- **Delay**: 600-1200ms random delay to simulate network requests
- **No Hardcoding**: All values come from `lib/mock/data.ts`
- **Type Safety**: Full TypeScript support, no "any" types
- **Error Handling**: Try-catch blocks with proper error propagation

## Error Boundaries

Every major section is wrapped with `<ErrorBoundary>`:

```typescript
<ErrorBoundary>
  <MarketSnapshotContent />
</ErrorBoundary>
```

- Catches component errors in child tree
- Displays fallback UI with error message
- Provides retry mechanism
- Logs errors to console in development

## Skeleton Loading States

Three types of skeletons for different content:

1. **CardSkeleton**: Generic card with heading and lines
2. **TableSkeleton**: Multi-row table skeleton
3. **ChartSkeleton**: Chart-sized skeleton

All use Tailwind's `animate-pulse` for smooth loading effect.

## Empty State Component

Displays when no data is available:

```typescript
<EmptyState
  icon={<span className="text-3xl">📊</span>}
  title="No Predictions"
  description="No predictions available at the moment"
  action={{
    label: "Create New",
    onClick: () => { /* ... */ }
  }}
/>
```

## Migration Checklist

When refactoring a component:

- [ ] Extract hardcoded data to `lib/mock/data.ts`
- [ ] Add TypeScript interface to `lib/types.ts`
- [ ] Create state variables for `loading | success | error`
- [ ] Add useEffect for simulated async fetch (600-1200ms)
- [ ] Handle each state with proper UI (skeleton, data, error, empty)
- [ ] Wrap component in `<ErrorBoundary>`
- [ ] Test loading, success, error, and empty states
- [ ] Remove all "any" types from component

## Best Practices

✅ **Do**:
- Use explicit TypeScript interfaces for all data
- Implement all four states (loading, success, error, empty)
- Add error boundaries to major sections
- Use 600-1200ms simulated delays
- Import from `lib/mock/data.ts`

❌ **Don't**:
- Hardcode values directly in components
- Use "any" type
- Skip error handling
- Forget loading states
- Mix old and new patterns

## Future: Real API Integration

To replace mock data with real API calls:

1. Replace `lib/mock/data.ts` with API client methods
2. Keep interfaces and state pattern identical
3. Remove simulated delays
4. Add retry logic with exponential backoff
5. Add request cancellation with AbortController

All component code will remain unchanged - only data source changes.
