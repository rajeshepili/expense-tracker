import { createFileRoute } from '@tanstack/react-router'
import { SavingsScreen } from '#/features/savings/savings-screen'

type SavingsSearch = {
  new?: boolean
}

export const Route = createFileRoute('/savings')({
  validateSearch: (search: Record<string, unknown>): SavingsSearch => ({
    new: search.new === true || search.new === '1' || search.new === 1,
  }),
  component: SavingsScreen,
})
