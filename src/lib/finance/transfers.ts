export type TransferLinkRow = {
  id: string
  transferId: string | null
  transferDirection: 'out' | 'in' | string | null
  type: string
}

/** Ids of transfer rows whose peer link is missing or inconsistent. */
export function orphanTransferIds(rows: Iterable<TransferLinkRow>): string[] {
  const list = [...rows]
  const byId = new Map(list.map((row) => [row.id, row]))
  const orphans: string[] = []

  for (const row of list) {
    if (row.type !== 'transfer') continue
    const peer = row.transferId ? byId.get(row.transferId) : undefined
    const broken =
      !row.transferId ||
      !peer ||
      peer.transferId !== row.id ||
      !row.transferDirection ||
      !peer.transferDirection ||
      row.transferDirection === peer.transferDirection
    if (broken) orphans.push(row.id)
  }

  return orphans
}
