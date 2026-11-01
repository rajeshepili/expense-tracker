import { useVirtualizer } from '@tanstack/react-virtual'
import { Fragment, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from 'cn'
import { TableBody } from '#/components/ui/table'

type VirtualRowRender<T> = (item: T, index: number) => ReactNode

type SharedProps<T> = {
  items: T[]
  estimateSize?: number
  overscan?: number
  getItemKey?: (item: T, index: number) => string | number
  children: VirtualRowRender<T>
}

export function VirtualizedList<T>({
  items,
  estimateSize = 56,
  overscan = 5,
  getItemKey,
  children,
  className,
  style,
}: SharedProps<T> & {
  className?: string
  style?: CSSProperties
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: (index) =>
      getItemKey ? getItemKey(items[index], index) : index,
  })

  return (
    <div
      ref={parentRef}
      className={cn('relative overflow-y-auto overscroll-contain', className)}
      style={style}
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {children(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  )
}

export function VirtualizedTable<T>({
  items,
  estimateSize = 48,
  overscan = 8,
  colSpan,
  getItemKey,
  header,
  children,
  className,
  empty,
}: SharedProps<T> & {
  colSpan: number
  header: ReactNode
  className?: string
  empty?: ReactNode
}) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const virtualizer = useVirtualizer({
    count: empty ? 0 : items.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => estimateSize,
    overscan,
    enabled: !!scrollEl && !empty,
    getItemKey: (index) =>
      getItemKey ? getItemKey(items[index], index) : index,
  })

  const virtualRows = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const paddingTop = virtualRows[0]?.start ?? 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0
  const useVirtual = !!scrollEl && virtualRows.length > 0

  return (
    <div
      ref={setScrollEl}
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain',
        className,
      )}
    >
      <table data-slot="table" className="w-full caption-bottom text-sm">
        {header}
        <TableBody>
          {empty ? (
            empty
          ) : useVirtual ? (
            <>
              {paddingTop > 0 ? (
                <tr aria-hidden="true">
                  <td
                    colSpan={colSpan}
                    style={{ height: paddingTop, padding: 0, border: 0 }}
                  />
                </tr>
              ) : null}
              {virtualRows.map((virtualRow) => (
                <Fragment key={virtualRow.key}>
                  {children(items[virtualRow.index], virtualRow.index)}
                </Fragment>
              ))}
              {paddingBottom > 0 ? (
                <tr aria-hidden="true">
                  <td
                    colSpan={colSpan}
                    style={{ height: paddingBottom, padding: 0, border: 0 }}
                  />
                </tr>
              ) : null}
            </>
          ) : (
            items.map((item, index) => (
              <Fragment
                key={getItemKey ? getItemKey(item, index) : index}
              >
                {children(item, index)}
              </Fragment>
            ))
          )}
        </TableBody>
      </table>
    </div>
  )
}
