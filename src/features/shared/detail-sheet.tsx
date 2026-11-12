import type { ReactNode } from 'react'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '#/components/ui/responsive-modal'
import { cn } from 'cn'

type DetailSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  contentClassName?: string
}

export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName = 'sm:max-w-md',
}: DetailSheetProps) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className={contentClassName}>
        <ResponsiveModalHeader className="space-y-1.5 text-left md:space-y-2">
          <ResponsiveModalTitle className="text-left text-lg md:text-xl">
            {title}
          </ResponsiveModalTitle>
          {description ? (
            <ResponsiveModalDescription className="text-left text-sm">
              {description}
            </ResponsiveModalDescription>
          ) : null}
        </ResponsiveModalHeader>
        <div className={cn('flex flex-col gap-5 pb-1 md:gap-6 md:pb-2')}>
          {children}
        </div>
        {footer ? (
          <ResponsiveModalFooter className="mt-1 flex-col gap-0 border-t border-border/70 pt-4 sm:flex-col sm:justify-stretch md:mt-2 md:pt-5">
            {footer}
          </ResponsiveModalFooter>
        ) : null}
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}

export function detailSheetBtnClass(compact: boolean, className?: string) {
  return cn('w-full active:scale-[0.97]', compact && 'min-h-11', className)
}

export function DetailSheetFooter({
  secondary,
  primary,
}: {
  secondary?: ReactNode
  primary: ReactNode
}) {
  return (
    <div className="flex w-full flex-col gap-2.5 md:gap-3">
      {secondary ? <div className="grid grid-cols-2 gap-2">{secondary}</div> : null}
      {primary}
    </div>
  )
}

export function closeDetailThen(
  onOpenChange: (open: boolean) => void,
  action: () => void,
) {
  onOpenChange(false)
  // Defer past the triggering click and Radix dismiss. A microtask (or even
  // setTimeout 0) can still open the next dialog inside the same dismiss
  // turn, so it flashes open and closes immediately.
  window.setTimeout(action, 100)
}
