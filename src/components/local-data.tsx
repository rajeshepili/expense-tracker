import { useEffect, useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { Button } from '#/components/ui/button'
import { downloadBackup, restoreBackup } from '#/data/backup'
import {
  dismissBackupReminder,
  errorMessage,
  formatLastExportLabel,
  getLastExportAt,
  shouldShowBackupReminder,
} from '#/lib/backup'
import { cn } from 'cn'

/** Static note: ledger data lives only in this browser. */
export function LocalDataCallout({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm',
        className,
      )}
    >
      <p className="font-medium">Data stays in this browser</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
        <li>
          Best in{' '}
          <span className="font-medium text-foreground">
            Chrome, Edge, or Brave
          </span>{' '}
          — not private/incognito if you want it to stick.
        </li>
        <li>
          Clearing site data, switching browsers, or closing a private window
          can erase the ledger.
        </li>
        <li>
          Use{' '}
          <span className="font-medium text-foreground">
            Budget → Export backup
          </span>{' '}
          for a recoverable <code className="text-[0.7rem]">.sqlite3</code>{' '}
          file.
        </li>
      </ul>
    </aside>
  )
}

/** Nudge to export when no recent backup exists. */
export function BackupReminder({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastLabel, setLastLabel] = useState(() =>
    formatLastExportLabel(getLastExportAt()),
  )

  useEffect(() => {
    setOpen(shouldShowBackupReminder())
  }, [])

  if (!open) return null

  return (
    <div
      role="status"
      className={cn(
        'rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Download a backup</p>
          <p className="text-xs text-muted-foreground">
            Data lives only in this browser. {lastLabel}. Export a{' '}
            <code className="text-[0.7rem]">.sqlite3</code> file you can restore
            later.
          </p>
          {error ? (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
              setError(null)
              void downloadBackup()
                .then(() => {
                  setLastLabel(formatLastExportLabel(getLastExportAt()))
                  setOpen(false)
                })
                .catch((err: unknown) => {
                  setError(errorMessage(err, 'Could not create backup'))
                })
                .finally(() => setPending(false))
            }}
          >
            <Download data-icon="inline-start" />
            {pending ? 'Exporting…' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Export / restore controls for the local SQLite file. */
export function BackupPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string | null>(null)
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
            setStatus(null)
            void downloadBackup()
              .then(({ filename }) => {
                setLastLabel(formatLastExportLabel(getLastExportAt()))
                setStatus(`Saved ${filename}`)
              })
              .catch((err: unknown) => {
                setError(errorMessage(err, 'Could not export backup'))
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
            setStatus(null)
          }}
        />
      </div>
      {status ? (
        <p className="text-xs text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}
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
            setError(errorMessage(err, 'Could not restore backup'))
          })
        }}
      />
    </div>
  )
}
