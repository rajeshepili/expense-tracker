import { useState } from 'react'
import { Filter, Search } from 'lucide-react'
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
import { useIsCompact } from '#/hooks/use-media-query'
import type { TransactionType } from '#/lib/types'
import { cn } from 'cn'

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
  onClearChip?: (key: string) => void
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
  onClearChip,
}: LedgerFiltersProps) {
  const isCompact = useIsCompact()
  const hasAdvanced = Boolean(categoryFilter || methodFilter)
  const [advancedOpen, setAdvancedOpen] = useState(hasAdvanced)
  const showAdvanced = !isCompact || advancedOpen || hasAdvanced

  return (
    <div className="flex shrink-0 flex-col gap-2 sm:gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Tabs
          value={filter}
          onValueChange={(value) =>
            onFilterChange(value as 'all' | TransactionType)
          }
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all" className="pressable flex-1 sm:flex-none">
              All
            </TabsTrigger>
            <TabsTrigger
              value="expense"
              className="pressable flex-1 sm:flex-none"
            >
              Expenses
            </TabsTrigger>
            <TabsTrigger
              value="income"
              className="pressable flex-1 sm:flex-none"
            >
              Income
            </TabsTrigger>
            <TabsTrigger
              value="transfer"
              className="pressable flex-1 sm:flex-none"
            >
              Transfers
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex w-full items-center gap-2 sm:max-w-xs">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search ledger…"
              className="min-h-11 pl-8 md:min-h-9"
              aria-label="Search ledger"
            />
          </div>
          {isCompact ? (
            <Button
              type="button"
              variant={showAdvanced ? 'secondary' : 'outline'}
              size="sm"
              className="min-h-11 min-w-11 shrink-0 touch-manipulation pressable"
              aria-expanded={showAdvanced}
              aria-label={showAdvanced ? 'Hide filters' : 'Show filters'}
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              <Filter aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
      <div className={cn('grid grid-cols-2 gap-2', !showAdvanced && 'hidden')}>
        <Select
          value={categoryFilter || '__all__'}
          onValueChange={(value) =>
            onCategoryChange(value === '__all__' ? null : value)
          }
        >
          <SelectTrigger
            className="min-h-11 w-full md:min-h-9"
            aria-label="Filter category"
          >
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
          <SelectTrigger
            className="min-h-11 w-full md:min-h-9"
            aria-label="Filter account"
          >
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__all__">All accounts</SelectItem>
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
          {chips.map((chip) =>
            onClearChip ? (
              <Button
                key={chip.key}
                type="button"
                variant={chip.outline ? 'outline' : 'secondary'}
                size="sm"
                className={cn(
                  'h-9 min-h-9 gap-1 px-2 text-xs touch-manipulation md:h-7 md:min-h-7',
                  chip.key === 'type' && 'capitalize',
                )}
                aria-label={`Clear ${chip.label} filter`}
                onClick={() => onClearChip(chip.key)}
              >
                {chip.label}
                <span aria-hidden className="text-muted-foreground">
                  ×
                </span>
              </Button>
            ) : (
              <Badge
                key={chip.key}
                variant={chip.outline ? 'outline' : 'secondary'}
                className={chip.key === 'type' ? 'capitalize' : undefined}
              >
                {chip.label}
              </Badge>
            ),
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 min-h-9 px-2 text-xs touch-manipulation md:h-7 md:min-h-7"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  )
}
