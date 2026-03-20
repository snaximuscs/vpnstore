import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive/20 text-red-400 border-red-800/50',
        outline:
          'text-foreground',
        // VPN-specific status variants
        active:
          'border-emerald-800/60 bg-emerald-950/60 text-emerald-300',
        inactive:
          'border-gray-700 bg-gray-800/60 text-gray-400',
        expired:
          'border-amber-800/60 bg-amber-950/60 text-amber-300',
        error:
          'border-red-800/60 bg-red-950/60 text-red-300',
        warning:
          'border-yellow-800/60 bg-yellow-950/60 text-yellow-300',
        tag:
          'border-brand-800/60 bg-brand-950/40 text-brand-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
