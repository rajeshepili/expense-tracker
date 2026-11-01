export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }

  static isAppError(err: unknown): err is AppError {
    return err instanceof AppError
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

export class StorageError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'STORAGE', cause)
    this.name = 'StorageError'
  }
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AppError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export function isErrorCode(err: unknown, code: AppError['code']): boolean {
  return AppError.isAppError(err) && err.code === code
}

export function safe<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  fn: T,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (err) {
      if (AppError.isAppError(err)) throw err
      if (err instanceof Error) {
        const msg = err.message.toLowerCase()
        if (msg.includes('unique') || msg.includes('already exists')) {
          throw new ConflictError(err.message, err)
        }
        if (msg.includes('not found') || msg.includes('no such')) {
          throw new NotFoundError('Entity', err)
        }
        throw new StorageError(err.message, err)
      }
      throw new StorageError('Unknown error', err)
    }
  }) as T
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

let toastPromise: Promise<{ error: (msg: string) => void }> | null = null

export function toastError(message: string) {
  if (!toastPromise) {
    toastPromise = import('sonner').then(({ toast }) => toast)
  }
  toastPromise.then((toast) => toast.error(message))
}