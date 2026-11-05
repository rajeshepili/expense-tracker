import { createFileRoute } from '@tanstack/react-router'
import { RecurringScreen } from '#/features/recurring/recurring-screen'

export const Route = createFileRoute('/recurring')({
  component: RecurringScreen,
})
