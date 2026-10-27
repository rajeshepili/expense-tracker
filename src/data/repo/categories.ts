import { and, count, eq } from 'drizzle-orm'
import { categories, recurringExpenses, transactions } from '#/db/schema'
import type { CategoryRow, TransactionType } from '#/lib/types'
import { withDb } from '#/data/repo/db'

export async function listCategories() {
  return withDb((db) => db.select().from(categories).orderBy(categories.name))
}

export async function listCategoriesWithUsage(): Promise<CategoryRow[]> {
  return withDb(async (db) => {
    const [rows, txCounts, recCounts] = await Promise.all([
      db.select().from(categories).orderBy(categories.name),
      db
        .select({
          categoryId: transactions.categoryId,
          value: count(),
        })
        .from(transactions)
        .groupBy(transactions.categoryId),
      db
        .select({
          categoryId: recurringExpenses.categoryId,
          value: count(),
        })
        .from(recurringExpenses)
        .groupBy(recurringExpenses.categoryId),
    ])

    const txByCategory = new Map(
      txCounts.map((row) => [row.categoryId, row.value ?? 0]),
    )
    const recByCategory = new Map(
      recCounts.map((row) => [row.categoryId, row.value ?? 0]),
    )

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      transactionCount: txByCategory.get(row.id) ?? 0,
      recurringCount: recByCategory.get(row.id) ?? 0,
    }))
  })
}

export async function createCategory(input: {
  name: string
  type: TransactionType
}) {
  return withDb(async (db) => {
    const name = input.name.trim()
    if (!name) throw new Error('Enter a category name')

    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.name, name), eq(categories.type, input.type)))
      .limit(1)
    if (existing[0]) {
      throw new Error(`“${name}” already exists for ${input.type}`)
    }

    const [row] = await db
      .insert(categories)
      .values({ name, type: input.type })
      .returning({ id: categories.id })
    return row
  })
}

export async function updateCategory(
  id: string,
  input: { name: string; type: TransactionType },
) {
  return withDb(async (db) => {
    const name = input.name.trim()
    if (!name) throw new Error('Enter a category name')

    const duplicate = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.name, name), eq(categories.type, input.type)))
      .limit(1)
    if (duplicate[0] && duplicate[0].id !== id) {
      throw new Error(`“${name}” already exists for ${input.type}`)
    }

    await db
      .update(categories)
      .set({ name, type: input.type })
      .where(eq(categories.id, id))
    return { success: true }
  })
}

export async function deleteCategory(
  id: string,
  options?: { replacementCategoryId?: string },
) {
  return withDb(async (db) => {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)
    if (!category) throw new Error('Category not found')

    const [{ value: transactionCount }] = await db
      .select({ value: count() })
      .from(transactions)
      .where(eq(transactions.categoryId, id))
    const [{ value: recurringCount }] = await db
      .select({ value: count() })
      .from(recurringExpenses)
      .where(eq(recurringExpenses.categoryId, id))

    const usedBy = (transactionCount ?? 0) + (recurringCount ?? 0)
    if (usedBy > 0) {
      const replacementId = options?.replacementCategoryId
      if (!replacementId) {
        throw new Error(
          'Choose another category to move existing transactions and recurring items into.',
        )
      }
      if (replacementId === id) {
        throw new Error('Choose a different category as the replacement.')
      }

      const [replacement] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, replacementId))
        .limit(1)
      if (!replacement) throw new Error('Replacement category not found')
      if (replacement.type !== category.type) {
        throw new Error(
          `Replacement must also be an ${category.type} category.`,
        )
      }

      await db
        .update(transactions)
        .set({ categoryId: replacementId })
        .where(eq(transactions.categoryId, id))
      await db
        .update(recurringExpenses)
        .set({ categoryId: replacementId })
        .where(eq(recurringExpenses.categoryId, id))
    }

    await db.delete(categories).where(eq(categories.id, id))
    return { success: true }
  })
}
