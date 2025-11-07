'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function InspectPage() {
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)

  const tables = [
    'agg_monthly_with_pic_table_6_month',
    'weekly_prediction_table',
    'top_movers_daily',
  ]

  const inspectTable = async (table: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/performance-tracker/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table }),
      })

      if (!response.ok) throw new Error('Failed to inspect table')
      const result = await response.json()
      setResults((prev) => ({ ...prev, [table]: result }))
    } catch (error) {
      console.error('Error:', error)
      setResults((prev) => ({
        ...prev,
        [table]: { error: 'Failed to fetch table info' },
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Table Inspector</h2>

      <div className="flex gap-2 flex-wrap">
        {tables.map((table) => (
          <Button key={table} onClick={() => inspectTable(table)} disabled={loading}>
            Inspect {table.split('_').pop()}
          </Button>
        ))}
      </div>

      {/* Results */}
      {Object.entries(results).map(([table, data]) => (
        <Card key={table}>
          <CardHeader>
            <CardTitle>{table}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.error ? (
              <p className="text-red-600">{data.error}</p>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold mb-2">Schema:</h3>
                  <div className="bg-slate-100 p-4 rounded overflow-x-auto">
                    <table className="text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Column</th>
                          <th className="text-left p-2">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.schema?.map((col: any, idx: number) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2">{col.column_name}</td>
                            <td className="p-2">{col.data_type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Sample Data:</h3>
                  <div className="bg-slate-100 p-4 rounded overflow-x-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(data.sample?.[0], null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
