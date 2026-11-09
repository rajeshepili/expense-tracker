import { useVirtualizer } from '@tanstack/react-virtual'
import { Fragment, useCallback, useState } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { PanelScroll } from '#/components/ui/panel-scroll'
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

/** Scroll parent for TanStack Virtual — state so the virtualizer rebinds on mount. */
function useVirtualScrollParent(listRootRef?: Ref<HTMLElement | null>) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const bindScrollEl = useCallback(
    (node: HTMLDivElement | null) => {
      setScrollEl(node)
      assignRef(listRootRef, node)
    },
    [listRootRef],
  )
  return { scrollEl, bindScrollEl }
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
  const { scrollEl, bindScrollEl } = useVirtualScrollParent(listRootRef)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => estimateSize,
    overscan,
    enabled: !!scrollEl,
    getItemKey: (index) =>
      getItemKey ? getItemKey(items[index], index) : index,
  })

  return (
    <PanelScroll ref={bindScrollEl} fill className={className} style={style}>
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
    </PanelScroll>
  )
}

function SpacerRow({ colSpan, height }: { colSpan: number; height: number }) {
  if (height <= 0) return null
  return (
    <tr aria-hidden="true">
      <td colSpan={colSpan} style={{ height, padding: 0, border: 0 }} />
    </tr>
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
  const { scrollEl, bindScrollEl } = useVirtualScrollParent(listRootRef)
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
  const largeList = items.length >= 24
  const useVirtual = !!scrollEl && (largeList || virtualRows.length > 0)

  let rows: ReactNode = null
  if (!empty) {
    if (largeList && !scrollEl) {
      rows = (
        <SpacerRow
          colSpan={colSpan}
          height={estimateSize * Math.min(items.length, 12)}
        />
      )
    } else if (useVirtual) {
      rows = (
        <>
          <SpacerRow colSpan={colSpan} height={paddingTop} />
          {virtualRows.map((virtualRow) => (
            <Fragment key={virtualRow.key}>
              {children(items[virtualRow.index], virtualRow.index)}
            </Fragment>
          ))}
          <SpacerRow colSpan={colSpan} height={paddingBottom} />
        </>
      )
    } else {
      rows = items.map((item, index) => (
        <Fragment key={getItemKey ? getItemKey(item, index) : index}>
          {children(item, index)}
        </Fragment>
      ))
    }
  }

  return (
    <PanelScroll ref={bindScrollEl} fill className={className}>
      {empty ?? (
        <table data-slot="table" className="w-full caption-bottom text-sm">
          {header}
          <TableBody>{rows}</TableBody>
        </table>
      )}
    </PanelScroll>
  )
}
