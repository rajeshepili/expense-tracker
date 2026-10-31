import { cn } from 'cn'
import { amountToneClass, money, signedAmountPrefix } from '#/lib/finance'
import type { TransactionType } from '#/lib/types'

export function SignedMoney({
  type,
  amount,
  currency,
  className,
}: {
  type: TransactionType
  amount: number
  currency: string
  className?: string
}) {
  return (
    <span className={cn(amountToneClass(type), className)}>
      {signedAmountPrefix(type)}
      {money(amount, currency)}
    </span>
  )
}
