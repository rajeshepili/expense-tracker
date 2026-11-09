import { useEffect, useState } from 'react'
import { ChevronDown, Download, HardDrive, X } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { downloadBackup } from '#/data/backup'
import {
  dismissBackupReminder,
  formatLastExportLabel,
  getLastExportAt,
  hideBackupReminderForever,
  hideLocalDataCalloutForever,
  isLocalDataCalloutHidden,
  shouldShowBackupReminder,
} from '#/lib/backup'
import { getErrorMessage } from '#/lib/errors'
import { cn } from 'cn'

const calloutBody = (
  <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
    <li>
      Prefer{' '}
      <span className="font-medium text-foreground">Chrome on Android</span> or
      Chrome / Edge / Brave on desktop — avoid private / incognito if you want
      the ledger to stick.
    </li>
    <li>
      On Android Chrome, use{' '}
      <span className="font-medium text-foreground">
        Install app / Add to Home Screen
      </span>{' '}
      for a home-screen shortcut. Desktop and phone keep separate local
      copies unless you export and restore.
    </li>
    <li>
      Clearing site data, switching browsers, or closing a private window can
      erase the ledger.
    </li>
    <li>
      Use{' '}
      <span className="font-medium text-foreground">
        Backup → Export backup
      </span>{' '}
      for a recoverable <code className="text-[0.7rem]">.sqlite3</code> file.
    </li>
  </ul>
)

const calloutSummary = (
  <span className="text-xs text-muted-foreground">
    Data lives in this browser only.{' '}
    <span className="font-medium text-foreground underline underline-offset-1 cursor-pointer">
      Tap to learn more
    </span>
  </span>
)

export function LocalDataCallout({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(() => isLocalDataCalloutHidden())

  if (hidden) return null

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn('bg-muted/40', className)}
    >
      <Alert className="bg-transparent py-2 pr-2">
        <HardDrive />
        <AlertTitle className="flex min-w-0 flex-1 items-center gap-1">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-h-11 min-w-0 flex-1 touch-manipulation items-center justify-between gap-2 text-left transition-transform duration-settle ease-settle active:scale-[0.97]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  Data stays in this browser
                </span>
                {!open ? calloutSummary : null}
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform duration-settle ease-settle',
                  open && 'rotate-180',
                )}
              />
            </button>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Don't show this again"
            title="Don't show this again"
            className="-mr-1 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              hideLocalDataCalloutForever()
              setHidden(true)
            }}
          >
            <X aria-hidden="true" />
          </Button>
        </AlertTitle>
        <CollapsibleContent className="col-span-2 min-w-0">
          <AlertDescription className="pt-1">{calloutBody}</AlertDescription>
        </CollapsibleContent>
      </Alert>
    </Collapsible>
  )
}

export function BackupReminder({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'in' | 'out'>('in')
  const [pending, setPending] = useState(false)
  const [lastLabel, setLastLabel] = useState(() =>
    formatLastExportLabel(getLastExportAt()),
  )

  useEffect(() => {
    if (shouldShowBackupReminder()) {
      setPhase('in')
      setOpen(true)
    }
  }, [])

  function closeReminder() {
    setPhase('out')
    window.setTimeout(() => setOpen(false), 160)
  }

  if (!open) return null

  return (
    <Alert className={cn(className, phase === 'out' && 'dismiss-fade-out')}>
      <Download />
      <AlertTitle>Download a backup</AlertTitle>
      <AlertDescription>
        <p>
          Data lives only in this browser. {lastLabel}. Export a{' '}
          <code className="text-[0.7rem]">.sqlite3</code> file you can restore
          later.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              dismissBackupReminder()
              closeReminder()
            }}
          >
            Later
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-muted-foreground"
            onClick={() => {
              hideBackupReminderForever()
              closeReminder()
            }}
          >
            Don&apos;t show again
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => {
              setPending(true)
              void downloadBackup()
                .then(() => {
                  setLastLabel(formatLastExportLabel(getLastExportAt()))
                  closeReminder()
                  toast.success('Backup exported')
                })
                .catch((err: unknown) => {
                  toast.error(getErrorMessage(err, 'Could not create backup'))
                })
                .finally(() => setPending(false))
            }}
          >
            <Download data-icon="inline-start" />
            {pending ? 'Exporting…' : 'Export'}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
