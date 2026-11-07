import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { accountDeltasQuery } from '#/data/query-builders'
import { accounts, categories, transactions } from '#/db/schema'
import { accountBalance } from '#/lib/finance'
import type { Db } from '#/data/repo/db'
import type { TransactionType, TransferDirection } from '#/lib/types'

const SCHEMA = `
CREATE TABLE categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE payment_methods (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'asset',
  starting_balance REAL NOT NULL DEFAULT 0,
  closed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE transactions (
  id TEXT PRIMARY KEY, description TEXT NOT NULL, amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense', transaction_date TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  payment_method_id TEXT REFERENCES payment_methods(id),
  source_recurring_id TEXT, transfer_id TEXT, transfer_direction TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_transactions_account_date ON transactions(payment_method_id, transaction_date);
`

const openDbs: InstanceType<typeof Database>[] = []

function setup() {
  const raw = new Database(':memory:')
  raw.exec(SCHEMA)
  openDbs.push(raw)
  const db = drizzle(raw, {
    schema: { accounts, categories, transactions },
  }) as unknown as Db
  raw.prepare(`INSERT INTO categories (id, name) VALUES ('c1', 'Food')`).run()
  raw
    .prepare(
      `INSERT INTO payment_methods (id, name, type, starting_balance) VALUES
        ('asset1', 'Checking', 'asset', 100),
        ('liab1', 'Credit card', 'liability', 0)`,
    )
    .run()
  const ins = raw.prepare(`
    INSERT INTO transactions (id, description, amount, type, transaction_date, category_id, payment_method_id, transfer_direction)
    VALUES (?, ?, ?, ?, '2026-03-01', 'c1', ?, ?)
  `)
  ins.run('t1', 'Groceries', 40, 'expense', 'asset1', null)
  ins.run('t2', 'Salary', 1000, 'income', 'asset1', null)
  ins.run('t3', 'Out', 50, 'transfer', 'asset1', 'out')
  ins.run('t4', 'In', 50, 'transfer', 'liab1', 'in')
  ins.run('t5', 'Bill', 30, 'expense', 'liab1', null)
  return { raw, db }
}

afterEach(() => {
  while (openDbs.length) openDbs.pop()?.close()
})

describe('accountDeltasQuery', () => {
  it('matches JS accountBalance semantics per account', async () => {
    const { raw, db } = setup()
    const deltas = await accountDeltasQuery(db)
    const byAccount = new Map(
      deltas.map((row) => [row.accountId!, row.delta]),
    )

    const rows = raw
      .prepare(
        `SELECT type, amount, transfer_direction FROM transactions WHERE payment_method_id = ?`,
      )
      .all('asset1') as Array<{
      type: TransactionType
      amount: number
      transfer_direction: TransferDirection | null
    }>

    const expectedAsset = accountBalance(
      100,
      rows.map((r) => ({
        type: r.type,
        amount: r.amount,
        transferDirection: r.transfer_direction,
      })),
      'asset',
    )
    const expectedLiab = accountBalance(
      0,
      (
        raw
          .prepare(
            `SELECT type, amount, transfer_direction FROM transactions WHERE payment_method_id = ?`,
          )
          .all('liab1') as Array<{
          type: TransactionType
          amount: number
          transfer_direction: TransferDirection | null
        }>
      ).map((r) => ({
        type: r.type,
        amount: r.amount,
        transferDirection: r.transfer_direction,
      })),
      'liability',
    )

    // SQL delta + starting balance === JS balance
    expect(100 + (byAccount.get('asset1') ?? 0)).toBeCloseTo(expectedAsset)
    expect(0 + (byAccount.get('liab1') ?? 0)).toBeCloseTo(expectedLiab)
    // Sanity: checking delta = +1000 - 40 - 50 = 910;
    // card (liability) delta = -50 (in) + 30 (expense) = -20
    expect(byAccount.get('asset1')).toBeCloseTo(910)
    expect(byAccount.get('liab1')).toBeCloseTo(-20)
  })
})
