'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface SubtleSkeletonProps {
  type?: 'table' | 'cards' | 'metrics' | 'text'
  rows?: number
  columns?: number
}

export function SubtleSkeleton({
  type = 'table',
  rows = 3,
  columns = 5
}: SubtleSkeletonProps) {

  if (type === 'table') {
    return <TableSkeleton rows={rows} columns={columns} />
  }

  if (type === 'cards') {
    return <CardsSkeleton count={rows} />
  }

  if (type === 'metrics') {
    return <MetricsSkeleton count={columns} />
  }

  if (type === 'text') {
    return <TextSkeleton lines={rows} />
  }

  return null
}

function TableSkeleton({ rows, columns }: { rows: number, columns: number }) {
  return (
    <Card style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
      <CardHeader className="pb-3">
        <div className="shimmer-box h-5 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Table Header */}
          <div className="flex gap-2 p-2 bg-slate-50 rounded">
            {Array.from({ length: columns }).map((_, i) => (
              <div
                key={i}
                className="shimmer-box h-4"
                style={{ flex: i === 0 ? '0 0 15%' : i === 1 ? '0 0 35%' : '1' }}
              />
            ))}
          </div>

          {/* Table Rows */}
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex gap-2 p-2">
              {Array.from({ length: columns }).map((_, colIdx) => {
                // Vary widths for realism
                const widthPercent = colIdx === 0 ? '15%' :
                                    colIdx === 1 ? '35%' :
                                    colIdx % 2 === 0 ? '18%' : '15%'
                return (
                  <div
                    key={colIdx}
                    className="shimmer-box h-4"
                    style={{ flex: colIdx <= 1 ? `0 0 ${widthPercent}` : '1' }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </CardContent>

      <style jsx>{`
        .shimmer-box {
          background: linear-gradient(
            90deg,
            #F5F5F5 0%,
            #EEEEEE 50%,
            #F5F5F5 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
          border-radius: 4px;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </Card>
  )
}

function CardsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, idx) => (
        <Card
          key={idx}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderLeft: '4px solid #E0E0E0'
          }}
        >
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 space-y-2">
                <div className="shimmer-box h-4 w-2/3" />
                <div className="shimmer-box h-3 w-1/3" />
              </div>
              <div className="shimmer-box h-6 w-16" />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="shimmer-box h-3 w-16" />
                  <div className="shimmer-box h-4 w-20" />
                  <div className="shimmer-box h-3 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <style jsx>{`
        .shimmer-box {
          background: linear-gradient(
            90deg,
            #F5F5F5 0%,
            #EEEEEE 50%,
            #F5F5F5 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
          border-radius: 4px;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}

function MetricsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <div className="shimmer-box h-3 w-20" />
          <div className="shimmer-box h-6 w-24" />
          <div className="shimmer-box h-3 w-16" />
        </div>
      ))}

      <style jsx>{`
        .shimmer-box {
          background: linear-gradient(
            90deg,
            #F5F5F5 0%,
            #EEEEEE 50%,
            #F5F5F5 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
          border-radius: 4px;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}

function TextSkeleton({ lines }: { lines: number }) {
  return (
    <Card style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, idx) => (
            <div key={idx} className="shimmer-box h-4" style={{
              width: idx === lines - 1 ? '70%' : '100%'
            }} />
          ))}
        </div>
      </CardContent>

      <style jsx>{`
        .shimmer-box {
          background: linear-gradient(
            90deg,
            #F5F5F5 0%,
            #EEEEEE 50%,
            #F5F5F5 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
          border-radius: 4px;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </Card>
  )
}
