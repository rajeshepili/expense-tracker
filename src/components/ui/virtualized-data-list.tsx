import { Fragment } from 'react'
import type { ReactNode, Ref } from 'react'
import {
  VirtualizedList,
  VirtualizedTable,
} from '#/components/ui/virtualized-list'
import {
  MobileList,
  MobileListFillShell,
} from '#/components/layout/mobile-list'
import { Table, TableBody } from '#/components/ui/table'
import { useIsCompact } from '#/hooks/use-media-query'
import { cn } from 'cn'

type VirtualizedDataListProps<T> = {
  items: T[]
  getItemKey: (item: T, index: number) => string | number
  mobileEstimateSize: number
  desktopEstimateSize: number
  colSpan: number
  header: ReactNode
  renderMobile: (item: T, index: number) => ReactNode
  renderDesktop: (item: T, index: number) => ReactNode
  overscan?: number
  empty?: ReactNode
  className?: string
  mobileClassName?: string
  layout?: 'fill' | 'flow'
  /** Forwarded to the scroll root that owns `[data-flip-key]` rows. */
  listRootRef?: Ref<HTMLElement | null>
}

export function VirtualizedDataList<T>({
  items,
  getItemKey,
  mobileEstimateSize,
  desktopEstimateSize,
  colSpan,
  header,
  renderMobile,
  renderDesktop,
  overscan = 6,
  empty,
  className,
  mobileClassName,
  layout = 'fill',
  listRootRef,
}: VirtualizedDataListProps<T>) {
  const isCompact = useIsCompact()
  const isEmpty = items.length === 0

  if (isCompact) {
    if (isEmpty) {
      return (
        <div
          className={cn(
            'min-h-0',
            layout === 'fill' && 'flex-1',
            mobileClassName,
          )}
        >
          {empty}
        </div>
      )
    }

    if (layout === 'flow') {
      return (
        <div
          ref={listRootRef as Ref<HTMLDivElement>}
          className={cn(mobileClassName)}
        >
          <MobileList>
            {items.map((item, index) => (
              <Fragment key={getItemKey(item, index)}>
                {renderMobile(item, index)}
              </Fragment>
            ))}
          </MobileList>
        </div>
      )
    }

    // Virtualized mobile uses translateY — do not attach FLIP root (WAAPI fight).
    return (
      <MobileListFillShell className={mobileClassName}>
        <VirtualizedList
          items={items}
          estimateSize={mobileEstimateSize}
          overscan={overscan}
          getItemKey={getItemKey}
        >
          {renderMobile}
        </VirtualizedList>
      </MobileListFillShell>
    )
  }

  if (layout === 'flow') {
    // Empty: no column header bar — same as compact (headers with no rows look broken).
    if (isEmpty) {
      return (
        <div ref={listRootRef as Ref<HTMLDivElement>} className={className}>
          {empty}
        </div>
      )
    }
    return (
      <div ref={listRootRef as Ref<HTMLDivElement>} className={className}>
        <Table>
          {header}
          <TableBody>
            {items.map((item, index) => (
              <Fragment key={getItemKey(item, index)}>
                {renderDesktop(item, index)}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div
        ref={listRootRef as Ref<HTMLDivElement>}
        className={cn('min-h-0 flex-1', className)}
      >
        {empty}
      </div>
    )
  }

  return (
    <VirtualizedTable
      items={items}
      colSpan={colSpan}
      estimateSize={desktopEstimateSize}
      overscan={overscan}
      getItemKey={getItemKey}
      header={header}
      className={className}
      listRootRef={listRootRef}
    >
      {renderDesktop}
    </VirtualizedTable>
  )
}
