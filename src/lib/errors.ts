export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'VALIDATION', cause)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, cause?: unknown) {
    super(`${entity} not found`, 'NOT_FOUND', cause)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CONFLICT', cause)
    this.name = 'ConflictError'
  }
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AppError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export function makeMutationErrorHandler<
  TContext extends { reopenDialog?: () => void },
>(
  setError: (msg: string | null) => void,
  fallback: string,
  context?: TContext,
) {
  return (err: Error) => {
    setError(getErrorMessage(err, fallback))
    context?.reopenDialog?.()
  }
}

export function formatQueryError(err: unknown): string {
  return getErrorMessage(err, 'Failed to load data')
}
