'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { composedStyles, typography } from '../../../lib/design-tokens'
import { colors } from '../../../lib/colors'

interface PivotTableProps {
  title: string
  data: any[]
  rows: string[] // Column names to use as row identifiers
  columns: string[] // Column names to display as headers
  value: string // Column name for the value to display
  format?: (value: any) => string
}

export function PivotTable({ title, data, rows, columns, value, format }: PivotTableProps) {
  // Group data by row keys
  const rowMap = new Map<string, Map<string, any>>()

  data.forEach((item) => {
    const rowKey = rows.map((r) => item[r]).join('|')
    const colKey = columns.map((c) => item[c]).join('|')

    if (!rowMap.has(rowKey)) {
      rowMap.set(rowKey, new Map())
    }
    rowMap.get(rowKey)!.set(colKey, item)
  })

  // Get unique column values
  const colSet = new Set<string>()
  data.forEach((item) => {
    colSet.add(columns.map((c) => item[c]).join('|'))
  })
  const colList = Array.from(colSet).sort()

  // Get unique row values
  const rowList = Array.from(rowMap.keys()).sort()

  return (
    <Card style={{ minHeight: '420px' }}>
      <CardHeader className="pb-3">
        <h3
          className={composedStyles.sectionTitle}
          style={{
            fontSize: typography.sizes.sectionTitle,
            color: colors.main
          }}
        >
          {title}
        </h3>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto" style={{ minHeight: '320px' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 shadow-sm">
                <th className="px-4 py-2 text-left font-semibold text-slate-600">
                  {rows.join(' / ')}
                </th>
                {colList.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2 text-right font-semibold text-slate-600"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowList.map((row, idx) => (
                <tr key={row} className={`border-b border-slate-200 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row}
                  </td>
                  {colList.map((col) => {
                    const item = rowMap.get(row)?.get(col)
                    const cellValue = item?.[value] ?? '-'
                    return (
                      <td key={`${row}-${col}`} className="px-4 py-3 text-right">
                        {format ? format(cellValue) : cellValue}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
