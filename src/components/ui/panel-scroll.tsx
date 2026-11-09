import * as React from 'react'
import { cn } from 'cn'

type PanelScrollProps = React.ComponentProps<'div'> & {
  fill?: boolean
}

function PanelScrollRoot(
  { className, fill = false, children, ...props }: PanelScrollProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <div
      ref={ref}
      data-slot="panel-scroll"
      data-orientation="vertical"
      data-scrollbar="thin"
      className={cn(
        'overscroll-contain outline-none overflow-x-hidden overflow-y-auto',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1',
        fill && 'min-h-0 flex-1',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const PanelScroll = React.forwardRef(PanelScrollRoot)

export { PanelScroll }
