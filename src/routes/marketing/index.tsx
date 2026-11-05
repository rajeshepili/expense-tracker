import { createFileRoute } from '@tanstack/react-router'
import { MarketingHome } from '#/components/landing/marketing-home'

export const Route = createFileRoute('/')({
  component: MarketingHome,
})
