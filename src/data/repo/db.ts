import { ensureDatabase, getDb } from '#/db/index'
import { needsOnboarding } from '#/data/seed'

export type Db = Awaited<ReturnType<typeof getDb>>

let bootstrapped: Promise<{ needsOnboarding: boolean }> | null = null

export async function bootstrapApp() {
  if (!bootstrapped) {
    bootstrapped = (async () => {
      await ensureDatabase()
      const needs = await needsOnboarding()
      return { needsOnboarding: needs }
    })()
    bootstrapped.catch(() => {
      bootstrapped = null
    })
  }
  return bootstrapped
}

export async function bootstrapDatabase() {
  await bootstrapApp()
}

/** Mark onboarding complete so subsequent boots skip the gate. */
export function markOnboardingComplete() {
  bootstrapped = Promise.resolve({ needsOnboarding: false })
}

export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  await bootstrapDatabase()
  return fn(await getDb())
}
