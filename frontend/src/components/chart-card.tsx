import { BarChart3, Table2 } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'

import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

type View = 'chart' | 'table'

interface ChartCardProps {
  title: string
  description: ReactNode
  legend?: ReactNode
  chart: ReactNode
  table: ReactNode
  className?: string
}

export function ChartCard({ title, description, legend, chart, table, className }: ChartCardProps) {
  const [view, setView] = useState<View>('chart')
  const headingId = useId()
  return (
    <Card className={className}>
      <CardHeader>
        <h2 id={headingId} className="text-base leading-snug font-medium">
          {title}
        </h2>
        <CardDescription className="text-[13px]">{description}</CardDescription>
        {legend}
        <CardAction>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            spacing={0}
            value={view}
            onValueChange={(v) => v && setView(v as View)}
            aria-label={`${title}: show as`}
          >
            <ToggleGroupItem value="chart">
              <BarChart3 aria-hidden /> Chart
            </ToggleGroupItem>
            <ToggleGroupItem value="table">
              <Table2 aria-hidden /> Table
            </ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent role="group" aria-labelledby={headingId}>
        {view === 'chart' ? chart : table}
      </CardContent>
    </Card>
  )
}

export interface LegendItem {
  label: string
  color: string
  kind?: 'line' | 'band' | 'bar'
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[13px] text-muted-foreground" aria-label="Legend">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              'shrink-0 rounded-[2px]',
              item.kind === 'line' || !item.kind ? 'h-0.5 w-3.5' : 'size-2.5',
              item.kind === 'band' && 'opacity-30',
            )}
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  numeric?: boolean
}

interface DataTableProps<T> {
  caption: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
}

export function DataTable<T>({ caption, columns, rows, rowKey }: DataTableProps<T>) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={caption}
      className="max-h-[360px] overflow-auto rounded-md border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <table className="w-full text-sm whitespace-nowrap">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                scope="col"
                className={cn('border-b px-3 py-2 font-normal', c.numeric && 'text-right')}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-border/70 first:border-t-0">
              {columns.map((c) => (
                <td key={c.header} className={cn('px-3 py-1.5', c.numeric && 'text-right tabular-nums')}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
