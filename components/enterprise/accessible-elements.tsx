import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react'

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  ariaLabel: string
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ children, ariaLabel, className = '', ...props }, ref) => (
    <button
      ref={ref}
      aria-label={ariaLabel}
      className={`transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-background ${className}`}
      {...props}
    >
      {children}
    </button>
  )
)
AccessibleButton.displayName = 'AccessibleButton'

interface AccessibleIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  ariaLabel: string
}

export const AccessibleIconButton = forwardRef<HTMLButtonElement, AccessibleIconButtonProps>(
  ({ icon, ariaLabel, className = '', ...props }, ref) => (
    <button
      ref={ref}
      aria-label={ariaLabel}
      role="button"
      className={`p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-1 focus:ring-offset-background ${className}`}
      {...props}
    >
      {icon}
    </button>
  )
)
AccessibleIconButton.displayName = 'AccessibleIconButton'
