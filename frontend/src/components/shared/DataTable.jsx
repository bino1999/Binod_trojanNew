import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function DataTable({
  columns,
  data,
  searchPlaceholder = 'Search…',
  searchKeys = [],
  filterSlot,
  emptyMessage = 'No records found.',
  rowClassName,
}) {
  const [query, setQuery] = useState('')

  const filtered = query.trim() === '' ? data : data.filter((row) => {
    const q = query.toLowerCase()
    return searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
  })

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        {filterSlot}
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('px-4 py-3 text-left font-medium text-muted-foreground', col.headerClass)}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className={cn(
                    'border-t hover:bg-muted/30 transition-colors',
                    rowClassName?.(row)
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3', col.cellClass)}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {data.length} record{data.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
