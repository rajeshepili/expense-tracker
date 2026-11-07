import { Badge } from '#/components/ui/badge'
import { dueStatus } from '#/lib/finance'

export function DueStatusBadge({ nextDate }: { nextDate: string }) {
  const status = dueStatus(nextDate)
  if (status === 'overdue') {
    return <Badge variant="destructive">Overdue</Badge>
  }
  if (status === 'due') {
    return <Badge>Due</Badge>
  }
  return null
}
