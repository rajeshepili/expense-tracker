'use client'

import * as React from 'react'
import { cn } from 'cn'
import { useIsMobile } from '#/hooks/use-media-query'
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

/** Pick one of two primitives by mode, so callers write each slot once. */
function pick<T>(drawer: T, dialog: T) {
  const mode = useModalMode()
  return mode === 'drawer' ? drawer : dialog
}

function ResponsiveModal({
  ...props
}: React.ComponentProps<typeof Dialog> & React.ComponentProps<typeof Drawer>) {
  const isMobile = useIsMobile()
  return (
    <ModalModeContext.Provider value={isMobile ? 'drawer' : 'dialog'}>
      {/* repositionInputs={false}: vaul's keyboard repositioning breaks on iOS (vaul#503). */}
      {isMobile ? <Drawer repositionInputs={false} {...props} /> : <Dialog {...props} />}
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
