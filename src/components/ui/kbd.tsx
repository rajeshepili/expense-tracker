import { cn } from 'cn'
import type { ComponentPropsWithoutRef, HTMLAttributes } from 'react'

type KbdProps = ComponentPropsWithoutRef<'kbd'> & {
  /** Hide on mobile, show from md breakpoint. Default true. */
  responsive?: boolean
  /** Style for use on primary button backgrounds. */
  primary?: boolean
}

export function Kbd({
  className,
  responsive = true,
  primary = false,
  ...props
}: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm border px-1 font-sans text-[0.65rem] font-semibold leading-none tracking-wide',
        '[&_svg:not([class*="size-"])]:size-3',
        responsive ? 'hidden md:inline-flex' : 'inline-flex',
        primary
          ? 'border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground shadow-none'
          : 'border-border/80 bg-muted/70 text-muted-foreground shadow-[inset_0_-1px_0_color-mix(in_oklch,var(--border)_70%,transparent)]',
        className,
      )}
      {...props}
    />
  )
}

type KbdGroupProps = HTMLAttributes<HTMLDivElement>

export function KbdGroup({ className, ...props }: KbdGroupProps) {
  return (
    <div
      data-slot="kbd-group"
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    />
  )
}
