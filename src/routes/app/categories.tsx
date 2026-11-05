import { createFileRoute } from '@tanstack/react-router'
import { CategoriesScreen } from '#/features/categories/categories-screen'

export const Route = createFileRoute('/categories')({
  component: CategoriesScreen,
})
