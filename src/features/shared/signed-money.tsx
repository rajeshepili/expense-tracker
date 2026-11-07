import { cn } from 'cn'
import { amountToneClass, money, signedAmountPrefix } from '#/lib/finance'
import type { TransactionType, TransferDirection } from '#/lib/types'

export function SignedMoney({
  type,
  amount,
  currency,
  transferDirection,
  className,
}: {
  type: TransactionType
  amount: number
  currency: string
  transferDirection?: TransferDirection | null
  className?: string
}) {
  return (
    <span className={cn(amountToneClass(type, transferDirection), className)}>
      {signedAmountPrefix(type, transferDirection)}
      {money(amount, currency)}
    </span>
  )
}
