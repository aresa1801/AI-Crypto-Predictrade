import { Skeleton } from '@/components/ui/skeleton'

export function CardSkeleton() {
  return (
    <div className="card-gradient space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-purple/20 to-accent-pink/20" />
        <Skeleton className="h-6 w-32 bg-surface-secondary/50" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full bg-surface-secondary/50" />
        <Skeleton className="h-4 w-full bg-surface-secondary/50" />
        <Skeleton className="h-4 w-2/3 bg-surface-secondary/50" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-pink/20" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-surface-secondary/50" />
            <Skeleton className="h-4 w-96 bg-surface-secondary/50" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Skeleton className="h-80 rounded-xl bg-gradient-to-br from-surface-primary/50 to-surface-secondary/50" />
        <Skeleton className="h-80 lg:col-span-2 rounded-xl bg-gradient-to-br from-surface-primary/50 to-surface-secondary/50" />
      </div>
      <Skeleton className="h-96 rounded-xl bg-gradient-to-br from-surface-primary/50 to-surface-secondary/50" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card-gradient space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-pink/20 to-accent-orange/20" />
        <Skeleton className="h-6 w-32 bg-surface-secondary/50" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-surface-secondary/50 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="card-gradient space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-indigo/20 to-accent-purple/20" />
        <Skeleton className="h-6 w-32 bg-surface-secondary/50" />
      </div>
      <Skeleton className="h-80 w-full bg-surface-secondary/50 rounded-lg" />
    </div>
  )
}
