import { Fragment } from 'react'
import type { ReactNode } from 'react'
import {
  VirtualizedList,
  VirtualizedTable,
} from '#/components/ui/virtualized-list'
import { MobileList } from '#/components/layout/mobile-list'
import { Table, TableBody } from '#/components/ui/table'
import { useIsMobile } from '#/hooks/use-media-query'
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
  desktopEmpty?: ReactNode
  className?: string
  mobileClassName?: string
  layout?: 'fill' | 'flow'
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
  desktopEmpty,
  className,
  mobileClassName,
  layout = 'fill',
}: VirtualizedDataListProps<T>) {
  const isMobile = useIsMobile()
  const isEmpty = items.length === 0
  const desktopEmptyBody =
    desktopEmpty ??
    (empty ? (
      <tr className="hover:bg-transparent">
        <td colSpan={colSpan} className="p-0">
          {empty}
        </td>
      </tr>
    ) : null)

  if (isMobile) {
    if (isEmpty) {
      return (
        <div className={cn('min-h-0', layout === 'fill' && 'flex-1', mobileClassName)}>
          {empty}
        </div>
      )
    }

    if (layout === 'flow') {
      return (
        <div className={cn(mobileClassName)}>
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

    return (
      <div className={cn('min-h-0 flex-1', mobileClassName)}>
        <MobileList className="flex min-h-0 max-h-full flex-col overflow-hidden p-0">
          <VirtualizedList
            items={items}
            estimateSize={mobileEstimateSize}
            overscan={overscan}
            getItemKey={getItemKey}
            className="min-h-0 flex-1"
          >
            {renderMobile}
          </VirtualizedList>
        </MobileList>
      </div>
    )
  }

  if (layout === 'flow') {
    return (
      <div className={className}>
        <Table>
          {header}
          <TableBody>
            {isEmpty
              ? desktopEmptyBody
              : items.map((item, index) => (
                  <Fragment key={getItemKey(item, index)}>
                    {renderDesktop(item, index)}
                  </Fragment>
                ))}
          </TableBody>
        </Table>
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
      empty={isEmpty ? desktopEmptyBody : undefined}
      header={header}
      className={className}
    >
      {renderDesktop}
    </VirtualizedTable>
  )
}
