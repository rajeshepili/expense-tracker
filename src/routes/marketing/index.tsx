import { createFileRoute } from '@tanstack/react-router'
import { LandingHome } from '#/components/landing/landing-home'

export const Route = createFileRoute('/')({
  component: LandingHome,
})
