'use client'

import * as React from 'react'
import { cn } from 'cn'
import { useIsCompact } from '#/hooks/use-media-query'
import { motion } from '#/lib/motion'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '#/components/ui/drawer'

const ModalModeContext = React.createContext<'drawer' | 'dialog'>('dialog')

function useModalMode() {
  return React.useContext(ModalModeContext)
}

function pick<T>(drawer: T, dialog: T) {
  const mode = useModalMode()
  return mode === 'drawer' ? drawer : dialog
}

function ResponsiveModal({
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Dialog> & React.ComponentProps<typeof Drawer>) {
  const isCompact = useIsCompact()
  const blocker = isCompact ? 'drawer' : 'modal'
  const openRef = React.useRef(Boolean(open))

  React.useEffect(() => {
    if (open === undefined) return
    openRef.current = open
    if (open) void motion.openOverlay(blocker)
    else motion.closeOverlay(blocker)
  }, [open, blocker])

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        // Open immediately; phase-gate in parallel so VT/page-enter still defer.
        void motion.openOverlay(blocker)
        onOpenChange?.(true)
        return
      }
      motion.closeOverlay(blocker)
      onOpenChange?.(false)
    },
    [blocker, onOpenChange],
  )

  React.useEffect(() => {
    return () => {
      if (openRef.current) motion.closeOverlay(blocker)
    }
  }, [blocker])

  return (
    <ModalModeContext.Provider value={isCompact ? 'drawer' : 'dialog'}>
      {/* repositionInputs={false}: vaul's keyboard repositioning breaks on iOS (vaul#503). */}
      {isCompact ? (
        <Drawer
          repositionInputs={false}
          open={open}
          onOpenChange={handleOpenChange}
          {...props}
        />
      ) : (
        <Dialog open={open} onOpenChange={handleOpenChange} {...props} />
      )}
    </ModalModeContext.Provider>
  )
}

function ResponsiveModalTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  return pick(<DrawerTrigger {...props} />, <DialogTrigger {...props} />)
}

function ResponsiveModalClose(props: React.ComponentProps<typeof DialogClose>) {
  return pick(<DrawerClose {...props} />, <DialogClose {...props} />)
}

function ResponsiveModalContent({
  className,
  children,
  showCloseButton,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const mode = useModalMode()
  if (mode === 'drawer') {
    return (
      <DrawerContent
        className={cn('max-h-[90dvh] gap-0 overflow-hidden p-0', className)}
        {...props}
      >
        <div className="flex max-h-[90dvh] flex-col overflow-y-auto overscroll-contain px-4 pb-[max(1rem,var(--safe-bottom))] pt-0">
          {children}
        </div>
      </DrawerContent>
    )
  }
  return (
    <DialogContent className={className} showCloseButton={showCloseButton} {...props}>
      {children}
    </DialogContent>
  )
}

function ResponsiveModalHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return pick(
    <DrawerHeader className={cn('text-left', className)} {...props} />,
    <DialogHeader className={className} {...props} />,
  )
}

function ResponsiveModalFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return pick(
    <DrawerFooter
      className={cn(
        'sticky bottom-0 z-10 -mx-4 border-t border-border/80 bg-background/95 px-4 pt-3 pb-[max(0.75rem,var(--safe-bottom))] backdrop-blur-md',
        className,
      )}
      {...props}
    />,
    <DialogFooter className={className} {...props} />,
  )
}

function ResponsiveModalTitle(props: React.ComponentProps<typeof DialogTitle>) {
  return pick(<DrawerTitle {...props} />, <DialogTitle {...props} />)
}

function ResponsiveModalDescription(props: React.ComponentProps<typeof DialogDescription>) {
  return pick(<DrawerDescription {...props} />, <DialogDescription {...props} />)
}

export {
  ResponsiveModal,
  ResponsiveModalTrigger,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
}
