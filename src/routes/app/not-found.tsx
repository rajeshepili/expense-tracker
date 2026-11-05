import { createFileRoute } from '@tanstack/react-router'
import { NotFoundPage } from '#/components/landing/not-found-page'

export const Route = createFileRoute('/not-found')({
  component: NotFoundPage,
})
