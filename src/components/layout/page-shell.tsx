import type { ReactNode, Ref } from 'react'
import { cn } from 'cn'
import { ScrollArea } from '#/components/ui/scroll-area'
import { TableCell, TableRow } from '#/components/ui/table'

type PageShellProps = {
  children: ReactNode
  className?: string
  scroll?: 'none' | 'page'
}

export function PageShell({
  children,
  className,
  scroll = 'none',
}: PageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-4 p-4 md:gap-5 md:p-8',
        scroll === 'page' && 'scroll-panel overflow-y-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TableScroll({
  children,
  className,
  viewportRef,
}: {
  children: ReactNode
  className?: string
  viewportRef?: Ref<HTMLDivElement>
}) {
  return (
    <ScrollArea
      className={cn('min-h-0 flex-1', className)}
      viewportRef={viewportRef}
    >
      {children}
    </ScrollArea>
  )
}

/** Empty / filtered placeholder inside a data table body. */
export function TableEmptyRow({
  colSpan,
  children,
}: {
  colSpan: number
  children: ReactNode
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0">
        {children}
      </TableCell>
    </TableRow>
  )
}
