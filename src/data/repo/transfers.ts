import { eq, inArray } from 'drizzle-orm'
import { accounts, transactions } from '#/db/schema'
import { ConflictError, NotFoundError, ValidationError } from '#/lib/errors'
import { isIsoDate, MONEY_EPSILON, orphanTransferIds } from '#/lib/finance'
import type {
  LedgerTransaction,
  TransferInput,
  TransferPair,
  TransferUpdate,
} from '#/lib/types'
import { withDb } from '#/data/repo/db'
import type { Db } from '#/data/repo/db'
import { baseTransactionQuery } from '#/data/query-builders'

const AUTO_TO_PREFIX = 'Transfer to '
const AUTO_FROM_PREFIX = 'Transfer from '

function isAutoDescription(value: string, prefix: string) {
  return value.startsWith(prefix)
}

function defaultDescriptions(fromName: string, toName: string) {
  return {
    out: `${AUTO_TO_PREFIX}${toName}`,
    in: `${AUTO_FROM_PREFIX}${fromName}`,
  }
}

function validateTransferAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= MONEY_EPSILON) {
    throw new ValidationError('Transfer amount must be greater than 0')
  }
}

function validateTransferDate(date: string) {
  if (!isIsoDate(date)) {
    throw new ValidationError('Enter a valid date (YYYY-MM-DD)')
  }
}

async function loadOpenAccount(db: Db, id: string) {
  const [row] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, id))
    .limit(1)
  if (!row) throw new NotFoundError('Account')
  if (row.closed) {
    throw new ValidationError(`Account “${row.name}” is closed`)
  }
  return row
}

async function loadLeg(db: Db, id: string): Promise<LedgerTransaction> {
  const rows = await baseTransactionQuery(db)
    .where(eq(transactions.id, id))
    .limit(1)
  const row = rows[0]
  if (!row) throw new NotFoundError('Transfer')
  return row
}

async function loadTransferPair(db: Db, legId: string): Promise<TransferPair> {
  const leg = await loadLeg(db, legId)
  if (leg.type !== 'transfer' || !leg.transferId) {
    throw new ConflictError('Transaction is not a linked transfer')
  }
  const peer = await loadLeg(db, leg.transferId)
  if (
    peer.type !== 'transfer' ||
    peer.transferId !== leg.id ||
    !leg.transferDirection ||
    !peer.transferDirection ||
    leg.transferDirection === peer.transferDirection
  ) {
    throw new ConflictError('Transfer pair is broken')
  }
  const out = leg.transferDirection === 'out' ? leg : peer
  const inn = leg.transferDirection === 'in' ? leg : peer
  return { out, in: inn }
}

export async function getTransferPair(legId: string): Promise<TransferPair> {
  return withDb((db) => loadTransferPair(db, legId))
}

export async function createTransfer(input: TransferInput) {
  return withDb(async (db) => {
    if (input.fromAccountId === input.toAccountId) {
      throw new ValidationError('Choose two different accounts')
    }
    validateTransferAmount(input.amount)
    validateTransferDate(input.date)
    const from = await loadOpenAccount(db, input.fromAccountId)
    const to = await loadOpenAccount(db, input.toAccountId)
    const labels = defaultDescriptions(from.name, to.name)
    const description = input.description?.trim()
    const outId = crypto.randomUUID()
    const inId = crypto.randomUUID()

    await db.insert(transactions).values([
      {
        id: outId,
        description: description || labels.out,
        amount: input.amount,
        type: 'transfer',
        transactionDate: input.date,
        categoryId: null,
        accountId: from.id,
        transferId: inId,
        transferDirection: 'out',
      },
      {
        id: inId,
        description: description ? description : labels.in,
        amount: input.amount,
        type: 'transfer',
        transactionDate: input.date,
        categoryId: null,
        accountId: to.id,
        transferId: outId,
        transferDirection: 'in',
      },
    ])

    return { outId, inId }
  })
}

export async function updateTransfer(legId: string, patch: TransferUpdate) {
  return withDb(async (db) => {
    const pair = await loadTransferPair(db, legId)
    let fromId = pair.out.accountId
    let toId = pair.in.accountId
    if (!fromId || !toId) throw new ConflictError('Transfer pair is broken')

    if (patch.fromAccountId) fromId = patch.fromAccountId
    if (patch.toAccountId) toId = patch.toAccountId
    if (fromId === toId) {
      throw new ValidationError('Choose two different accounts')
    }

    const amount = patch.amount ?? pair.out.amount
    validateTransferAmount(amount)
    const date = patch.date ?? pair.out.date
    validateTransferDate(date)
    const from = await loadOpenAccount(db, fromId)
    const to = await loadOpenAccount(db, toId)
    const labels = defaultDescriptions(from.name, to.name)

    const accountsChanged =
      fromId !== pair.out.accountId || toId !== pair.in.accountId
    let outDescription = pair.out.description
    let inDescription = pair.in.description
    if (patch.description !== undefined) {
      const trimmed = patch.description.trim()
      outDescription = trimmed || labels.out
      inDescription = trimmed || labels.in
    } else if (accountsChanged) {
      if (isAutoDescription(pair.out.description, AUTO_TO_PREFIX)) {
        outDescription = labels.out
      }
      if (isAutoDescription(pair.in.description, AUTO_FROM_PREFIX)) {
        inDescription = labels.in
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(transactions)
        .set({
          description: outDescription,
          amount,
          transactionDate: date,
          categoryId: null,
          accountId: from.id,
          type: 'transfer',
          transferDirection: 'out',
          transferId: pair.in.id,
        })
        .where(eq(transactions.id, pair.out.id))
      await tx
        .update(transactions)
        .set({
          description: inDescription,
          amount,
          transactionDate: date,
          categoryId: null,
          accountId: to.id,
          type: 'transfer',
          transferDirection: 'in',
          transferId: pair.out.id,
        })
        .where(eq(transactions.id, pair.in.id))
    })

    return { success: true as const, outId: pair.out.id, inId: pair.in.id }
  })
}

export async function deleteTransfer(legId: string) {
  return withDb(async (db) => {
    const [leg] = await db
      .select({
        id: transactions.id,
        transferId: transactions.transferId,
        type: transactions.type,
      })
      .from(transactions)
      .where(eq(transactions.id, legId))
      .limit(1)
    if (!leg) throw new NotFoundError('Transfer')

    const ids = new Set<string>([leg.id])
    if (leg.transferId) ids.add(leg.transferId)
    await db.delete(transactions).where(inArray(transactions.id, [...ids]))
    return { success: true as const, deletedIds: [...ids] }
  })
}

export async function repairOrphanTransfers() {
  return withDb(async (db) => {
    const transferRows = await db
      .select({
        id: transactions.id,
        transferId: transactions.transferId,
        transferDirection: transactions.transferDirection,
        type: transactions.type,
      })
      .from(transactions)
      .where(eq(transactions.type, 'transfer'))

    const orphans = orphanTransferIds(transferRows)
    if (orphans.length > 0) {
      await db.transaction(async (tx) => {
        for (const id of orphans) {
          await tx.delete(transactions).where(eq(transactions.id, id))
        }
      })
    }
    return { repaired: orphans.length }
  })
}
