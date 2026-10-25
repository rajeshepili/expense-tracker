import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, HardDrive, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { downloadBackup, restoreBackup } from '#/data/backup'
import {
  dismissBackupReminder,
  errorMessage,
  formatLastExportLabel,
  getLastExportAt,
  shouldShowBackupReminder,
} from '#/lib/backup'
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
      for an app-like shortcut. Desktop and phone are separate local copies
      unless you export and restore.
    </li>
    <li>
      Clearing site data, switching browsers, or closing a private window can
      erase the ledger.
    </li>
    <li>
      Use{' '}
      <span className="font-medium text-foreground">
        Budget → Export backup
      </span>{' '}
      for a recoverable <code className="text-[0.7rem]">.sqlite3</code> file.
    </li>
  </ul>
)

export function LocalDataCallout({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)

  if (!compact) {
    return (
      <Alert className={cn('bg-muted/40', className)}>
        <HardDrive />
        <AlertTitle>Data stays in this browser</AlertTitle>
        <AlertDescription>{calloutBody}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <Alert className="bg-muted/40 py-2">
        <HardDrive />
        <AlertTitle className="flex items-center justify-between gap-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-h-11 flex-1 touch-manipulation items-center justify-between gap-2 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
            >
              <span className="min-w-0">
                <span className="block font-medium">
                  Data stays in this browser
                </span>
                {!open ? (
                  <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                    Local only · export backups · Chrome recommended
                  </span>
                ) : null}
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out',
                  open && 'rotate-180',
                )}
              />
            </button>
          </CollapsibleTrigger>
        </AlertTitle>
        <CollapsibleContent>
          <AlertDescription className="pt-1">{calloutBody}</AlertDescription>
        </CollapsibleContent>
      </Alert>
    </Collapsible>
  )
}

export function BackupReminder({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [lastLabel, setLastLabel] = useState(() =>
    formatLastExportLabel(getLastExportAt()),
  )

  useEffect(() => {
    setOpen(shouldShowBackupReminder())
  }, [])

  if (!open) return null

  return (
    <Alert className={cn(className)}>
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
              setOpen(false)
            }}
          >
            Later
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
                  setOpen(false)
                  toast.success('Backup exported')
                })
                .catch((err: unknown) => {
                  toast.error(errorMessage(err, 'Could not create backup'))
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

export function BackupPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastLabel, setLastLabel] = useState(() =>
    formatLastExportLabel(getLastExportAt()),
  )
  const busy = exporting || restoring

  return (
    <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
      <div>
        <p className="text-sm font-medium">Local backup</p>
        <p className="text-xs text-muted-foreground">
          Download a <code className="text-[0.7rem]">.sqlite3</code> copy, or
          restore one to replace all data on this device. {lastLabel}.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => {
            setExporting(true)
            setError(null)
            void downloadBackup()
              .then(({ filename }) => {
                setLastLabel(formatLastExportLabel(getLastExportAt()))
                toast.success(`Saved ${filename}`)
              })
              .catch((err: unknown) => {
                const message = errorMessage(err, 'Could not export backup')
                setError(message)
                toast.error(message)
              })
              .finally(() => setExporting(false))
          }}
        >
          <Download data-icon="inline-start" />
          {exporting ? 'Exporting…' : 'Export backup'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload data-icon="inline-start" />
          Restore backup
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".sqlite3,.sqlite,.db,application/octet-stream"
          className="sr-only"
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null
            event.target.value = ''
            if (!next) return
            setFile(next)
            setError(null)
          }}
        />
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDeleteDialog
        open={Boolean(file)}
        onOpenChange={(open) => {
          if (!open) {
            setFile(null)
            setRestoring(false)
          }
        }}
        title="Replace all local data?"
        description={`Restoring “${file?.name ?? 'backup'}” overwrites every transaction, category, and setting in this browser. The page will reload.`}
        confirmLabel="Restore & reload"
        pendingLabel="Restoring…"
        pending={restoring}
        error={error}
        onConfirm={() => {
          if (!file) return
          setRestoring(true)
          setError(null)
          void restoreBackup(file).catch((err: unknown) => {
            setRestoring(false)
            const message = errorMessage(err, 'Could not restore backup')
            setError(message)
            toast.error(message)
          })
        }}
      />
    </div>
  )
}
