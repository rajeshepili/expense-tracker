'use client'

import * as React from 'react'
import { cn } from 'cn'
import { Progress as ProgressPrimitive } from 'radix-ui'
import { motion } from '#/lib/motion'

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const [snap, setSnap] = React.useState(false)
  React.useEffect(() => {
    if (motion.reduced()) return
    const update = () => setSnap(!motion.can('dataTween'))
    update()
    return motion.subscribe(update)
  }, [])
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          'h-full w-full flex-1 bg-primary motion-reduce:transition-none',
          snap && 'transition-none',
        )}
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          transition: snap
            ? 'none'
            : `transform var(--duration-data) var(--ease-data)`,
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
