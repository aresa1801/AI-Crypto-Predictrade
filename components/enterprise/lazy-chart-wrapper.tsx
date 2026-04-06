import { Suspense, ReactNode } from 'react'
import { ChartSkeleton } from '@/components/skeletons'

interface LazyChartWrapperProps {
  children: ReactNode
  height?: number
}

export function LazyChartWrapper({ children, height = 300 }: LazyChartWrapperProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={height} />}>
      {children}
    </Suspense>
  )
}
