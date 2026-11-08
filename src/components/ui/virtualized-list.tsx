import { useVirtualizer } from '@tanstack/react-virtual'
import { Fragment, useCallback, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { cn } from 'cn'
import { TableBody } from '#/components/ui/table'

type VirtualRowRender<T> = (item: T, index: number) => ReactNode

type SharedProps<T> = {
  items: T[]
  estimateSize?: number
  overscan?: number
  getItemKey?: (item: T, index: number) => string | number
  children: VirtualRowRender<T>
  /** Ancestor of `[data-flip-key]` rows for FLIP measurements. */
  listRootRef?: Ref<HTMLElement | null>
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (!ref) return
  if (typeof ref === 'function') ref(value)
  else ref.current = value
}

export function VirtualizedList<T>({
  items,
  estimateSize = 56,
  overscan = 5,
  getItemKey,
  children,
  className,
  style,
  listRootRef,
}: SharedProps<T> & {
  className?: string
  style?: CSSProperties
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const setParentRef = useCallback(
    (node: HTMLDivElement | null) => {
      parentRef.current = node
      assignRef(listRootRef, node)
    },
    [listRootRef],
  )
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
      ref={setParentRef}
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
  listRootRef,
}: SharedProps<T> & {
  colSpan: number
  header: ReactNode
  className?: string
  empty?: ReactNode
}) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const bindScrollEl = useCallback(
    (node: HTMLDivElement | null) => {
      setScrollEl(node)
      assignRef(listRootRef, node)
    },
    [listRootRef],
  )
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
  // Large lists must not paint every row before scrollEl attaches.
  const largeList = items.length >= 24
  const useVirtual = !!scrollEl && (largeList || virtualRows.length > 0)

  if (empty) {
    return (
      <div
        ref={bindScrollEl}
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain',
          className,
        )}
      >
        {empty}
      </div>
    )
  }

  return (
    <div
      ref={bindScrollEl}
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain',
        className,
      )}
    >
      <table data-slot="table" className="w-full caption-bottom text-sm">
        {header}
        <TableBody>
          {largeList && !scrollEl ? (
            <tr aria-hidden="true">
              <td
                colSpan={colSpan}
                style={{
                  height: estimateSize * Math.min(items.length, 12),
                  padding: 0,
                  border: 0,
                }}
              />
            </tr>
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
              <Fragment key={getItemKey ? getItemKey(item, index) : index}>
                {children(item, index)}
              </Fragment>
            ))
          )}
        </TableBody>
      </table>
    </div>
  )
}
