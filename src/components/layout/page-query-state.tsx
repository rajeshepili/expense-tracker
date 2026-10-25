import { Button } from '#/components/ui/button'

export function PageLoading({ label }: { label: string }) {
  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-6xl items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function PageError({
  title,
  message,
  onRetry,
}: {
  title: string
  message?: string | null
  onRetry?: () => void
}) {
  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-6xl flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}
