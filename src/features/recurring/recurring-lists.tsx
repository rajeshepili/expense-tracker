import { useRef } from 'react'
import { MoreHorizontal, Plus, Repeat } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Switch } from '#/components/ui/switch'
import {
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { VirtualizedDataList } from '#/components/ui/virtualized-data-list'
import { DueStatusBadge } from '#/features/shared/due-status-badge'
import { EmptyState } from '#/components/layout/empty-state'
import { MobileListRow } from '#/components/layout/mobile-list'
import { Kbd } from '#/components/ui/kbd'
import { useFlipList } from '#/hooks/use-flip-list'
import { useIsCompact } from '#/hooks/use-media-query'
import type { useRecordRecurring } from '#/hooks/use-record-recurring'
import {
  amountDue,
  cadenceLabel,
  canOneTapRecord,
  formatIsoDate,
  money,
  monthlyEquivalent,
  percent,
} from '#/lib/finance'
import type { RecurringExpenseRow } from '#/lib/types'

type RecurringListsProps = {
  items: RecurringExpenseRow[]
  currency: string
  monthlyBudget: number
  recording: boolean
  togglePending: boolean
  recorder: ReturnType<typeof useRecordRecurring>
  onToggle: (id: string, active: boolean) => void
  onEdit: (item: RecurringExpenseRow) => void
  onCreate: () => void
  onSkip: (item: RecurringExpenseRow) => void
  onViewPayments: (item: RecurringExpenseRow) => void
  onDelete: (item: RecurringExpenseRow) => void
}

type RowHandlers = Pick<
  RecurringListsProps,
  | 'currency'
  | 'monthlyBudget'
  | 'recording'
  | 'togglePending'
  | 'recorder'
  | 'onToggle'
  | 'onEdit'
  | 'onSkip'
  | 'onViewPayments'
  | 'onDelete'
>

function RecordButton({
  item,
  recording,
  recorder,
  touch,
}: {
  item: RecurringExpenseRow
  recording: boolean
  recorder: ReturnType<typeof useRecordRecurring>
  touch?: boolean
}) {
  if (!item.active) return null
  const oneTap = canOneTapRecord(item.nextDate)
  return (
    <Button
      size="sm"
      variant={oneTap ? 'default' : 'outline'}
      className={touch ? 'min-h-11 active:scale-[0.97]' : 'active:scale-[0.97]'}
      disabled={recording}
      onClick={() =>
        oneTap ? recorder.recordOneTap(item) : recorder.openAdjust(item)
      }
    >
      {oneTap ? 'Record' : 'Pay early'}
    </Button>
  )
}

function RecurringActionsMenu({
  item,
  recording,
  recorder,
  onEdit,
  onSkip,
  onViewPayments,
  onDelete,
  touch,
}: {
  item: RecurringExpenseRow
  recording: boolean
  recorder: ReturnType<typeof useRecordRecurring>
  onEdit: (item: RecurringExpenseRow) => void
  onSkip: (item: RecurringExpenseRow) => void
  onViewPayments?: (item: RecurringExpenseRow) => void
  onDelete: (item: RecurringExpenseRow) => void
  touch?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={touch ? 'icon' : 'icon-sm'}
          className={touch ? 'min-h-11 min-w-11' : undefined}
          aria-label={`Actions for ${item.name}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {item.active ? (
          <>
            <DropdownMenuItem
              onClick={() => recorder.openAdjust(item)}
              disabled={recording}
            >
              {canOneTapRecord(item.nextDate) ? 'Adjust…' : 'Pay early…'}
            </DropdownMenuItem>
            {onViewPayments ? (
              <DropdownMenuItem onClick={() => onViewPayments(item)}>
                View payments
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => onSkip(item)} disabled={recording}>
              Skip
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(item)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RecurringMobileRow({
  item,
  index,
  flipState,
  currency,
  recording,
  togglePending,
  recorder,
  onToggle,
  onEdit,
  onSkip,
  onViewPayments,
  onDelete,
}: {
  item: RecurringExpenseRow
  index: number
  flipState?: 'enter' | 'exit'
} & Omit<RowHandlers, 'monthlyBudget'>) {
  return (
    <MobileListRow
      className={!item.active ? 'opacity-60' : undefined}
      flip={
        flipState
          ? { key: item.id, state: flipState, index }
          : { key: item.id, index }
      }
      title={
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{item.name}</span>
          {item.active ? <DueStatusBadge nextDate={item.nextDate} /> : null}
        </span>
      }
      meta={`${item.category}${item.paymentMethod ? ` · ${item.paymentMethod}` : ''} · ${cadenceLabel[item.cadence]} · next ${formatIsoDate(item.nextDate, true)}${item.remainingAmount !== null ? ` · ${money(amountDue(item), currency)} left` : ''}`}
      trailing={
        <span className="tabular-nums">{money(amountDue(item), currency)}</span>
      }
      onClick={flipState === 'exit' ? undefined : () => onEdit(item)}
      actions={
        flipState === 'exit' ? null : (
          <>
            <RecordButton
              item={item}
              recording={recording}
              recorder={recorder}
              touch
            />
            <Switch
              checked={item.active}
              disabled={togglePending}
              onCheckedChange={(checked) => onToggle(item.id, checked)}
              aria-label={`Toggle ${item.name}`}
              className="mr-1"
            />
            <RecurringActionsMenu
              item={item}
              recording={recording}
              recorder={recorder}
              onEdit={onEdit}
              onSkip={onSkip}
              onViewPayments={onViewPayments}
              onDelete={onDelete}
              touch
            />
          </>
        )
      }
    />
  )
}

function RecurringTableRow({
  item,
  index,
  flipState,
  currency,
  monthlyBudget,
  recording,
  togglePending,
  recorder,
  onToggle,
  onEdit,
  onSkip,
  onViewPayments,
  onDelete,
}: {
  item: RecurringExpenseRow
  index: number
  flipState?: 'enter' | 'exit'
} & RowHandlers) {
  const monthly = monthlyEquivalent(item.amount, item.cadence)
  const itemOfBudget = monthlyBudget > 0 ? monthly / monthlyBudget : 0

  return (
    <TableRow
      key={item.id}
      data-flip-key={item.id}
      data-flip-enter={flipState === 'enter' ? '' : undefined}
      data-flip-exit={flipState === 'exit' ? '' : undefined}
      style={
        flipState === 'enter'
          ? {
              ['--flip-enter-delay' as string]: `${Math.min(index, 8) * 40}ms`,
            }
          : undefined
      }
      className={!item.active ? 'opacity-60' : undefined}
    >
      <TableCell className="font-medium">
        <span className="inline-flex flex-wrap items-center gap-2">
          {item.name}
          {item.active ? <DueStatusBadge nextDate={item.nextDate} /> : null}
        </span>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="secondary">{item.category}</Badge>
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {item.paymentMethod ?? '—'}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <Badge variant="outline">{cadenceLabel[item.cadence]}</Badge>
      </TableCell>
      <TableCell className="hidden text-muted-foreground xl:table-cell">
        {formatIsoDate(item.nextDate, true)}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap tabular-nums">
        <span className="block">{money(amountDue(item), currency)}</span>
        {item.remainingAmount !== null ? (
          <span className="block text-xs text-muted-foreground">
            of {money(item.amount, currency)}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="hidden text-right whitespace-nowrap tabular-nums md:table-cell">
        {money(monthly, currency)}
      </TableCell>
      <TableCell className="hidden text-right whitespace-nowrap tabular-nums lg:table-cell">
        {item.active ? percent(itemOfBudget) : '—'}
      </TableCell>
      <TableCell>
        <Switch
          checked={item.active}
          disabled={togglePending}
          onCheckedChange={(checked) => onToggle(item.id, checked)}
          aria-label={`Toggle ${item.name}`}
        />
      </TableCell>
      <TableCell>
        <RecordButton item={item} recording={recording} recorder={recorder} />
      </TableCell>
      <TableCell>
        <RecurringActionsMenu
          item={item}
          recording={recording}
          recorder={recorder}
          onEdit={onEdit}
          onSkip={onSkip}
          onViewPayments={onViewPayments}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  )
}

export function RecurringLists(props: RecurringListsProps) {
  const { items, onCreate } = props
  const listRef = useRef<HTMLElement | null>(null)
  const isCompact = useIsCompact()
  const { isEntering, isExiting } = useFlipList(
    listRef,
    items,
    (item) => item.id,
    { waapi: !isCompact, enters: !isCompact },
  )

  function flipState(id: string): 'enter' | 'exit' | undefined {
    if (isCompact) return undefined
    if (isExiting(id)) return 'exit'
    if (isEntering(id)) return 'enter'
    return undefined
  }

  const empty = (
    <EmptyState
      icon={<Repeat />}
      title="No recurring expenses"
      description={
        <>
          <p className="mb-2">Track rent, subscriptions, and other repeats.</p>
          <p className="text-xs text-muted-foreground">
            Tap <Kbd className="mx-1">N</Kbd> or the button below to create your
            first one.
          </p>
        </>
      }
      action={
        <Button size="sm" onClick={onCreate} className="w-full sm:w-auto">
          <Plus data-icon="inline-start" />
          Add Recurring Expense
        </Button>
      }
    />
  )

  return (
    <VirtualizedDataList
      listRootRef={listRef}
      items={items}
      getItemKey={(item) => item.id}
      mobileEstimateSize={88}
      desktopEstimateSize={52}
      colSpan={10}
      empty={empty}
      header={
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Category</TableHead>
            <TableHead className="hidden md:table-cell">Method</TableHead>
            <TableHead className="hidden lg:table-cell">Cadence</TableHead>
            <TableHead className="hidden lg:table-cell">Next</TableHead>
            <TableHead className="text-right whitespace-nowrap">
              Amount
            </TableHead>
            <TableHead className="hidden text-right whitespace-nowrap md:table-cell">
              Monthly
            </TableHead>
            <TableHead className="hidden text-right whitespace-nowrap lg:table-cell">
              Of budget
            </TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-28">
              <span className="sr-only">Record</span>
            </TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
      }
      renderMobile={(item, index) => (
        <RecurringMobileRow
          item={item}
          index={index}
          flipState={flipState(item.id)}
          {...props}
        />
      )}
      renderDesktop={(item, index) => (
        <RecurringTableRow
          item={item}
          index={index}
          flipState={flipState(item.id)}
          {...props}
        />
      )}
    />
  )
}
