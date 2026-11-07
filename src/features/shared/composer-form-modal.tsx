import { cloneElement, isValidElement, useEffect, useRef } from 'react'
import type { ReactNode, ForwardedRef } from 'react'
import { Button } from '#/components/ui/button'
import { useIsCompact } from '#/hooks/use-media-query'
import { FieldError } from '#/components/ui/field'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from '#/components/ui/responsive-modal'

type TriggerElement = React.ReactElement<{ ref?: ForwardedRef<HTMLButtonElement> }>

type ComposerFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: TriggerElement
  title: string
  description?: string
  pending?: boolean
  submitDisabled?: boolean
  submitLabel?: string
  pendingLabel?: string
  /** Hide the primary submit button (Cancel only). */
  hideSubmit?: boolean
  submitVariant?: 'default' | 'destructive'
  error?: string | null
  onSubmit?: () => void
  /** Read-only viewer: dismiss button only, no Save. */
  mode?: 'form' | 'view'
  children: ReactNode
  contentClassName?: string
}

function focusFirstInput(content: HTMLElement | null) {
  if (!content) return
  const input = content.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
  )
  input?.focus()
}

export function ComposerFormModal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  pending = false,
  submitDisabled = false,
  submitLabel = 'Save',
  pendingLabel = 'Saving…',
  hideSubmit = false,
  submitVariant = 'default',
  error,
  onSubmit,
  mode = 'form',
  children,
  contentClassName = 'sm:max-w-md',
}: ComposerFormModalProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(open)
  const isCompact = useIsCompact()

  // Focus first input on desktop dialogs only — on compact the sheet is a vaul
  // drawer and autofocus mid-animation shoves it off-screen (vaul#503).
  useEffect(() => {
    if (open && !wasOpen.current && !isCompact) {
      requestAnimationFrame(() => {
        focusFirstInput(contentRef.current)
      })
    }
    wasOpen.current = open
  }, [open, isCompact])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && triggerRef.current) {
      setTimeout(() => triggerRef.current?.focus(), 0)
    }
    onOpenChange(nextOpen)
  }

  const triggerButton = trigger ? (
    <ResponsiveModalTrigger asChild>
      {isValidElement(trigger)
        ? cloneElement(trigger as React.ReactElement<React.ComponentProps<'button'>>, {
            ref: triggerRef as React.Ref<HTMLButtonElement>,
            type: 'button',
          })
        : trigger}
    </ResponsiveModalTrigger>
  ) : null

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
      {triggerButton}
      <ResponsiveModalContent ref={contentRef} className={contentClassName}>
        {mode === 'view' ? (
          <>
            <ResponsiveModalHeader>
              <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
              {description ? (
                <ResponsiveModalDescription>
                  {description}
                </ResponsiveModalDescription>
              ) : null}
            </ResponsiveModalHeader>
            {children}
            <ResponsiveModalFooter>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => handleOpenChange(false)}
              >
                Dismiss
              </Button>
            </ResponsiveModalFooter>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit?.()
            }}
          >
            <ResponsiveModalHeader>
              <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
              {description ? (
                <ResponsiveModalDescription>
                  {description}
                </ResponsiveModalDescription>
              ) : null}
            </ResponsiveModalHeader>
            {children}
            {error ? <FieldError className="px-0 pt-2">{error}</FieldError> : null}
            <ResponsiveModalFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              {hideSubmit ? null : (
                <Button
                  type="submit"
                  variant={submitVariant}
                  disabled={pending || submitDisabled}
                >
                  {pending ? pendingLabel : submitLabel}
                </Button>
              )}
            </ResponsiveModalFooter>
          </form>
        )}
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
