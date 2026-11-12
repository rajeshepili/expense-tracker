import { useRef, useState } from 'react'
import { BellRing, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { ComposerFormModal } from '#/features/shared/composer-form-modal'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'
import { downloadBackup, restoreBackup } from '#/data/backup'
import type { RestoreMode } from '#/data/backup'
import { listAllTransactions } from '#/data/repository'
import { toast } from 'sonner'
import {
  downloadBlob,
  formatLastExportLabel,
  getLastExportAt,
} from '#/lib/backup'
import { getErrorMessage } from '#/lib/errors'
import { transactionsToCsv } from '#/lib/export-csv'
import {
  ensureNotificationPermission,
  isRemindersEnabled,
  scheduleBillReminders,
  setRemindersEnabled,
} from '#/lib/notifications'

export function BackupModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastLabel, setLastLabel] = useState(() =>
    formatLastExportLabel(getLastExportAt()),
  )
  const [remindersOn, setRemindersOn] = useState(() => isRemindersEnabled())
  const [exportingCsv, setExportingCsv] = useState(false)
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge')
  const busy = exporting || restoring || exportingCsv

  async function runRestore(mode: RestoreMode) {
    if (!file) return
    setRestoring(true)
    setError(null)
    try {
      await restoreBackup(file, { mode })
    } catch (err: unknown) {
      setRestoring(false)
      const message = getErrorMessage(err, 'Could not restore backup')
      setError(message)
      toast.error(message)
    }
  }

  async function exportCsv() {
    setExportingCsv(true)
    try {
      const rows = await listAllTransactions()
      const stamp = new Date().toISOString().slice(0, 10)
      const filename = `pocketbook-ledger-${stamp}.csv`
      downloadBlob(
        new Blob([transactionsToCsv(rows)], { type: 'text/csv;charset=utf-8' }),
        filename,
      )
      toast.success(`Saved ${filename} (${rows.length} rows)`)
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Could not export CSV')
      setError(message)
      toast.error(message)
    } finally {
      setExportingCsv(false)
    }
  }

  async function toggleReminders(next: boolean) {
    if (next) {
      const granted = await ensureNotificationPermission()
      if (!granted) {
        toast.error(
          'Notifications are blocked — allow them in the browser settings.',
        )
        return
      }
      setRemindersEnabled(true)
      setRemindersOn(true)
      const shown = await scheduleBillReminders({ force: true })
      toast.success(
        shown.length > 0
          ? `${shown.length} bill${shown.length === 1 ? '' : 's'} due soon — reminders scheduled`
          : 'Bill reminders on — you will be notified before due dates',
      )
    } else {
      setRemindersEnabled(false)
      setRemindersOn(false)
    }
  }

  return (
    <ComposerFormModal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setFile(null)
          setRestoring(false)
          setError(null)
          setRestoreMode('merge')
        }
      }}
      title="Local backup"
      description="Download a .sqlite3 copy, or restore one. Merge keeps your local rows and brings back anything missing from the backup."
      pending={busy}
      hideSubmit={!file}
      submitDisabled={!file || busy}
      submitLabel={
        restoreMode === 'replace' ? 'Replace all & reload' : 'Merge & reload'
      }
      submitVariant={restoreMode === 'replace' ? 'destructive' : 'default'}
      pendingLabel={
        restoring ? 'Restoring…' : exporting ? 'Exporting…' : undefined
      }
      error={error}
      onSubmit={async () => {
        await runRestore(restoreMode)
      }}
    >
      <div className="grid gap-3 py-2">
        <p className="text-sm text-muted-foreground">{lastLabel}</p>
        <label
          htmlFor="reminders-switch"
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
        >
          <BellRing
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Bill reminders</span>
            <span className="block text-xs text-muted-foreground">
              Local notifications up to 2 days before a bill is due. Nothing
              leaves this device.
            </span>
          </span>
          <Switch
            id="reminders-switch"
            checked={remindersOn}
            onCheckedChange={(checked) => void toggleReminders(checked)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 md:min-h-9"
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
                  const message = getErrorMessage(err, 'Could not export backup')
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
            className="min-h-11 md:min-h-9"
            disabled={busy}
            onClick={() => void exportCsv()}
          >
            <FileSpreadsheet data-icon="inline-start" />
            {exportingCsv ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 md:min-h-9"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            Choose file…
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
        {file ? (
          <div className="grid gap-2 rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
            <p>
              Selected: {file.name} ({Math.round(file.size / 1024)} KB).
            </p>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="restore-mode"
                className="mt-0.5"
                checked={restoreMode === 'merge'}
                disabled={busy}
                onChange={() => setRestoreMode('merge')}
              />
              <span>
                <span className="font-medium text-foreground">Merge</span>
                {' — '}
                add missing rows; keep local data when ids already exist (prefer
                newer created time).
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="restore-mode"
                className="mt-0.5"
                checked={restoreMode === 'replace'}
                disabled={busy}
                onChange={() => setRestoreMode('replace')}
              />
              <span>
                <span className="font-medium text-foreground">Replace all</span>
                {' — '}
                wipe this device and load only the backup.
              </span>
            </label>
          </div>
        ) : null}
      </div>
    </ComposerFormModal>
  )
}
