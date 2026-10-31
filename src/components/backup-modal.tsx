import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { ComposerFormModal } from '#/components/composer-form-modal'
import { Button } from '#/components/ui/button'
import { downloadBackup, restoreBackup } from '#/data/backup'
import { toast } from 'sonner'
import {
  formatLastExportLabel,
  getLastExportAt,
} from '#/lib/backup'

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
  const busy = exporting || restoring

  return (
    <ComposerFormModal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setFile(null)
          setRestoring(false)
          setError(null)
        }
      }}
      title="Local backup"
      description="Download a .sqlite3 copy, or restore one to replace all data on this device."
      pending={busy}
      submitDisabled={!file && !exporting}
      submitLabel={file ? 'Restore & reload' : undefined}
      pendingLabel={restoring ? 'Restoring…' : exporting ? 'Exporting…' : undefined}
      onSubmit={async () => {
        if (file) {
          setRestoring(true)
          setError(null)
          try {
            await restoreBackup(file)
          } catch (err: unknown) {
            setRestoring(false)
            const message =
              err instanceof Error ? err.message : 'Could not restore backup'
            setError(message)
            toast.error(message)
          }
        }
      }}
    >
      <div className="grid gap-3 py-2">
        <p className="text-sm text-muted-foreground">{lastLabel}</p>
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
                  const message =
                    err instanceof Error ? err.message : 'Could not export backup'
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
        {file && (
          <p className="text-xs text-muted-foreground">
            Selected: {file.name} ({Math.round(file.size / 1024)} KB)
          </p>
        )}
      </div>
    </ComposerFormModal>
  )
}