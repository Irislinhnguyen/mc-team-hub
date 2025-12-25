'use client'

import { Card, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/colors'
import { typography } from '@/lib/design-tokens'

interface Column {
  key: string
  label: string
  width?: string
  align?: 'left' | 'right' | 'center'
  format?: (value: any) => string | React.ReactNode
}

interface SimpleDataTableProps {
  title: string
  columns: Column[]
  data: any[]
  onRowClick?: (row: any) => void
  maxHeight?: string
}

export function SimpleDataTable({
  title,
  columns,
  data,
  onRowClick,
  maxHeight = '400px'
}: SimpleDataTableProps) {

  const formatCellValue = (value: any, formatter?: (value: any) => string | React.ReactNode) => {
    if (formatter) {
      return formatter(value)
    }
    return value ?? '-'
  }

  if (data.length === 0) {
    return (
      <Card
        style={{
          backgroundColor: '#FFFFFF',
          border: `1px solid ${colors.neutralLight}`,
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        }}
      >
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3 text-[#1565C0]">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground text-center py-4">
            No data available
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${colors.neutralLight}`,
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      <CardContent className="p-4">
        <h3
          className="font-semibold text-sm mb-3"
          style={{
            fontSize: typography.sizes.sectionTitle,
            color: colors.main
          }}
        >
          {title}
        </h3>
        <div
          className="overflow-y-auto"
          style={{ maxHeight }}
        >
          <table className="w-full border-collapse">
            <thead
              className="sticky top-0 shadow-sm"
              style={{
                zIndex: 20,
                backgroundColor: colors.main
              }}
            >
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-2 font-semibold leading-tight"
                    style={{
                      minWidth: col.width,
                      fontSize: typography.sizes.filterHeader,
                      color: colors.text.inverse,
                      textAlign: col.align || 'left'
                    }}
                  >
                    <span className="whitespace-nowrap">{col.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className={`border-b border-slate-200 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-2 py-2 leading-tight"
                      style={{
                        fontSize: typography.sizes.dataPoint,
                        maxWidth: '300px',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal',
                        color: colors.text.primary,
                        textAlign: col.align || 'left'
                      }}
                    >
                      {formatCellValue(row[col.key], col.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
