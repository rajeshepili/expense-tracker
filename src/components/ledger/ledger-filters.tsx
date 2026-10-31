import { Search } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import type { TransactionType } from '#/lib/types'

type NamedOption = { id: string; name: string }

export type LedgerFilterChip = {
  key: string
  label: string
  outline?: boolean
}

type LedgerFiltersProps = {
  filter: 'all' | TransactionType
  onFilterChange: (value: 'all' | TransactionType) => void
  query: string
  onQueryChange: (value: string) => void
  categoryFilter?: string
  methodFilter?: string
  categories: NamedOption[]
  methods: NamedOption[]
  onCategoryChange: (categoryId: string | null) => void
  onMethodChange: (methodId: string | null) => void
  chips: LedgerFilterChip[]
  onClearFilters: () => void
}

export function LedgerFilters({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  categoryFilter,
  methodFilter,
  categories,
  methods,
  onCategoryChange,
  onMethodChange,
  chips,
  onClearFilters,
}: LedgerFiltersProps) {
  return (
    <div className="flex shrink-0 flex-col gap-2 sm:gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Tabs
          value={filter}
          onValueChange={(value) =>
            onFilterChange(value as 'all' | TransactionType)
          }
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="expense">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search ledger"
            className="pl-8"
            aria-label="Search ledger"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={categoryFilter || '__all__'}
          onValueChange={(value) =>
            onCategoryChange(value === '__all__' ? null : value)
          }
        >
          <SelectTrigger className="w-full" aria-label="Filter category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__all__">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={methodFilter || '__all__'}
          onValueChange={(value) =>
            onMethodChange(value === '__all__' ? null : value)
          }
        >
          <SelectTrigger className="w-full" aria-label="Filter payment method">
            <SelectValue placeholder="All methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__all__">All methods</SelectItem>
              {methods.map((method) => (
                <SelectItem key={method.id} value={method.id}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {chips.length > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant={chip.outline ? 'outline' : 'secondary'}
              className={chip.key === 'type' ? 'capitalize' : undefined}
            >
              {chip.label}
            </Badge>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  )
}
