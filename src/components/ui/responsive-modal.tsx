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

function ResponsiveModal({
  ...props
}: React.ComponentProps<typeof Dialog> & React.ComponentProps<typeof Drawer>) {
  const isMobile = useIsMobile()
  return (
    <ModalModeContext.Provider value={isMobile ? 'drawer' : 'dialog'}>
      {isMobile ? <Drawer {...props} /> : <Dialog {...props} />}
    </ModalModeContext.Provider>
  )
}

function ResponsiveModalTrigger({
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const mode = useModalMode()
  return mode === 'drawer' ? (
    <DrawerTrigger {...props} />
  ) : (
    <DialogTrigger {...props} />
  )
}

function ResponsiveModalClose({
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const mode = useModalMode()
  return mode === 'drawer' ? (
    <DrawerClose {...props} />
  ) : (
    <DialogClose {...props} />
  )
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
        <div className="flex max-h-[90dvh] flex-col overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0">
          {children}
        </div>
      </DrawerContent>
    )
  }
  return (
    <DialogContent
      className={className}
      showCloseButton={showCloseButton}
      {...props}
    >
      {children}
    </DialogContent>
  )
}

function ResponsiveModalHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const mode = useModalMode()
  return mode === 'drawer' ? (
    <DrawerHeader className={cn('text-left', className)} {...props} />
  ) : (
    <DialogHeader className={className} {...props} />
  )
}

function ResponsiveModalFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const mode = useModalMode()
  return mode === 'drawer' ? (
    <DrawerFooter className={cn('px-0', className)} {...props} />
  ) : (
    <DialogFooter className={className} {...props} />
  )
}

function ResponsiveModalTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const mode = useModalMode()
  return mode === 'drawer' ? (
    <DrawerTitle className={className} {...props} />
  ) : (
    <DialogTitle className={className} {...props} />
  )
}

function ResponsiveModalDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const mode = useModalMode()
  return mode === 'drawer' ? (
    <DrawerDescription className={className} {...props} />
  ) : (
    <DialogDescription className={className} {...props} />
  )
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
