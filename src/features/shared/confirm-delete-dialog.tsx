import type { ReactNode } from 'react'
import { Button } from '#/components/ui/button'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '#/components/ui/responsive-modal'

type ConfirmDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel?: string
  pendingLabel?: string
  pending?: boolean
  confirmDisabled?: boolean
  error?: string | null
  onConfirm: () => void
  children?: ReactNode
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  pendingLabel = 'Deleting…',
  pending = false,
  confirmDisabled = false,
  error = null,
  onConfirm,
  children,
}: ConfirmDeleteDialogProps) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="sm:max-w-md" showCloseButton={false}>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>
        {children}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <ResponsiveModalFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || confirmDisabled}
            onClick={onConfirm}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
