import { useState } from 'react'
import { Filter, Search } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
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

export type LedgerFiltersProps = {
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
}

/**
 * Filter controls for the ledger. Active-filter chips are rendered by the
 * parent (header / reserved strip) so selecting a filter never shifts the
 * table. On compact, category/account pickers live in a popover from the
 * filter button instead of an inline expanding row.
 */
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
}: LedgerFiltersProps) {
  const isCompact = useIsCompact()
  const hasAdvanced = Boolean(categoryFilter || methodFilter)
  const [advancedOpen, setAdvancedOpen] = useState(hasAdvanced)

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
            <DropdownMenu
              open={advancedOpen}
              onOpenChange={setAdvancedOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={hasAdvanced ? 'secondary' : 'outline'}
                  size="sm"
                  className="min-h-11 min-w-11 shrink-0 touch-manipulation pressable"
                  aria-label={
                    advancedOpen ? 'Hide category and account filters' : 'Show category and account filters'
                  }
                >
                  <Filter aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuLabel>Category</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={categoryFilter ?? '__all__'}
                  onValueChange={(v) =>
                    onCategoryChange(v === '__all__' ? null : v)
                  }
                >
                  <DropdownMenuRadioItem value="__all__">
                    All categories
                  </DropdownMenuRadioItem>
                  {categories.map((category) => (
                    <DropdownMenuRadioItem key={category.id} value={category.id}>
                      {category.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={methodFilter ?? '__all__'}
                  onValueChange={(v) =>
                    onMethodChange(v === '__all__' ? null : v)
                  }
                >
                  <DropdownMenuRadioItem value="__all__">
                    All accounts
                  </DropdownMenuRadioItem>
                  {methods.map((method) => (
                    <DropdownMenuRadioItem key={method.id} value={method.id}>
                      {method.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="grid flex-1 grid-cols-2 gap-2">
              <CategoryAccountSelect
                label="Filter category"
                placeholder="All categories"
                value={categoryFilter}
                options={categories}
                onChange={onCategoryChange}
              />
              <CategoryAccountSelect
                label="Filter account"
                placeholder="All accounts"
                value={methodFilter}
                options={methods}
                onChange={onMethodChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type SelectProps = {
  label: string
  placeholder: string
  value?: string
  options: NamedOption[]
  onChange: (id: string | null) => void
}

function CategoryAccountSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
}: SelectProps) {
  return (
    <Select
      value={value || '__all__'}
      onValueChange={(v) => onChange(v === '__all__' ? null : v)}
    >
      <SelectTrigger className="min-h-11 w-full md:min-h-9" aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="__all__">{placeholder}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export type LedgerFilterChipsProps = {
  chips: LedgerFilterChip[]
  onClearFilters: () => void
  onClearChip: (key: string) => void
}

/** Active-filter chips — always mounted by the parent with reserved height. */
export function LedgerFilterChips({
  chips,
  onClearFilters,
  onClearChip,
}: LedgerFilterChipsProps) {
  return (
    <div
      className={cn(
        'flex h-8 shrink-0 items-center gap-2 overflow-x-auto scrollbar-none',
        chips.length === 0 && 'invisible',
      )}
      aria-hidden={chips.length === 0}
    >
      {chips.map((chip) => (
        <Button
          key={chip.key}
          type="button"
          variant={chip.outline ? 'outline' : 'secondary'}
          size="sm"
          className={cn(
            'h-7 min-h-7 shrink-0 gap-1 px-2 text-xs touch-manipulation',
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
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 min-h-7 shrink-0 px-2 text-xs touch-manipulation"
        onClick={onClearFilters}
      >
        Clear filters
      </Button>
    </div>
  )
}
