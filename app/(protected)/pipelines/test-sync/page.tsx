'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CLASSIFICATION_TYPES,
  CHANNEL_TYPES,
  REGIONS,
  PRODUCT_TYPES,
  NEXT_ACTION_TYPES,
  ACTION_DETAIL_TYPES,
  PIPELINE_STAGES,
} from '@/lib/types/pipeline'

export default function TestSyncPage() {
  const [formData, setFormData] = useState({
    // Required (A, C, D)
    publisher: 'Kroobannok.com',  // G - required by API
    poc: 'Zenny',                 // D
    classification: 'New Unit (New Slot)',  // C
    group: 'sales' as 'sales' | 'cs',

    // Details (J, O, P)
    domain: 'Kroobannok.com',     // J
    description: '',              // O
    product: 'Video / Wipe',      // P

    // Revenue (S, T, V)
    imp: 2728000,                 // S
    ecpm: 0.19,                   // T
    revenue_share: 20,            // V

    // Timeline (AC, AD, AF)
    starting_date: '2025-12-30',  // AC
    status: '【C】',               // AD
    proposal_date: '2025-01-15',  // AF

    // Actions (X, Y, Z, AA)
    action_date: '2025-11-21',    // X
    next_action: '',              // Y
    action_detail: '',            // Z
    action_progress: 'send link register',  // AA
  })

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fiscal_year: 2025,
          fiscal_quarter: 1,
        }),
      })

      const data = await response.json()
      setResult({
        status: response.status,
        success: response.ok,
        data,
      })
    } catch (error: any) {
      setResult({
        status: 0,
        success: false,
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Pipeline Sync - Full Fields</CardTitle>
          <CardDescription>
            Test tạo pipeline với ĐẦY ĐỦ fields (data từ Kroobannok.com) để verify sync mapping
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info (C, D, G) */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-blue-700">Basic Info</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Classification (Col C)</Label>
                <Select
                  value={formData.classification}
                  onValueChange={(value) => setFormData({ ...formData, classification: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select classification" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>POC * (Col D)</Label>
                <Input
                  value={formData.poc}
                  onChange={(e) => setFormData({ ...formData, poc: e.target.value })}
                  placeholder="Point of Contact"
                />
              </div>
              <div>
                <Label>Group *</Label>
                <Select
                  value={formData.group}
                  onValueChange={(value: 'sales' | 'cs') => setFormData({ ...formData, group: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="cs">CS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Details (J, O, P) */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-blue-700">Details (Cols J, O, P)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Domain * (Col J)</Label>
                <Input
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value, publisher: e.target.value })}
                  placeholder="example.com"
                />
              </div>
              <div>
                <Label>Pipeline Detail (Col O)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description"
                />
              </div>
              <div>
                <Label>Product (Col P)</Label>
                <Select
                  value={formData.product}
                  onValueChange={(value) => setFormData({ ...formData, product: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Revenue Inputs (S, T, V) */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-blue-700">Revenue (Cols S, T, V)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>IMP (Col S)</Label>
                <Input
                  type="number"
                  value={formData.imp}
                  onChange={(e) => setFormData({ ...formData, imp: parseInt(e.target.value) || 0 })}
                  placeholder="2728000"
                />
              </div>
              <div>
                <Label>eCPM (Col T)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.ecpm}
                  onChange={(e) => setFormData({ ...formData, ecpm: parseFloat(e.target.value) || 0 })}
                  placeholder="0.19"
                />
              </div>
              <div>
                <Label>Revenue Share % (Col V)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.revenue_share}
                  onChange={(e) => setFormData({ ...formData, revenue_share: parseFloat(e.target.value) || 0 })}
                  placeholder="20"
                />
              </div>
            </div>
          </div>

          {/* Timeline (AC, AD, AF) */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-blue-700">Timeline (Cols AC, AD, AF)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Starting Date (Col AC)</Label>
                <Input
                  type="date"
                  value={formData.starting_date}
                  onChange={(e) => setFormData({ ...formData, starting_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Status (Col AD)</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Proposal Date (Col AF)</Label>
                <Input
                  type="date"
                  value={formData.proposal_date}
                  onChange={(e) => setFormData({ ...formData, proposal_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Actions (X, Y, Z, AA) */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-blue-700">Actions (Cols X, Y, Z, AA)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Action Date (Col X)</Label>
                <Input
                  type="date"
                  value={formData.action_date}
                  onChange={(e) => setFormData({ ...formData, action_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Next Action (Col Y)</Label>
                <Select
                  value={formData.next_action}
                  onValueChange={(value) => setFormData({ ...formData, next_action: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {NEXT_ACTION_TYPES.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Action Detail (Col Z)</Label>
                <Select
                  value={formData.action_detail}
                  onValueChange={(value) => setFormData({ ...formData, action_detail: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select detail" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_DETAIL_TYPES.map((detail) => (
                      <SelectItem key={detail} value={detail}>
                        {detail}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Action Progress (Col AA)</Label>
                <Textarea
                  value={formData.action_progress}
                  onChange={(e) => setFormData({ ...formData, action_progress: e.target.value })}
                  placeholder="Progress notes..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button onClick={handleCreate} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
            {loading ? 'Creating Pipeline...' : 'Create Pipeline & Test Sync'}
          </Button>

          {/* Result Display */}
          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
              <h3 className="font-bold mb-2">
                {result.success ? '✅ Success' : '❌ Failed'}
              </h3>
              <p><strong>Status:</strong> {result.status}</p>
              {result.data?.data?.id && (
                <>
                  <p><strong>Pipeline ID:</strong> <code className="bg-gray-200 px-2 py-1 rounded">{result.data.data.id}</code></p>
                  <p><strong>Publisher:</strong> {result.data.data.publisher}</p>
                  <p><strong>Status:</strong> {result.data.data.status}</p>
                  <p><strong>Q Gross:</strong> ${result.data.data.q_gross?.toFixed(2) || '0.00'}</p>
                  <p><strong>Q Net Rev:</strong> ${result.data.data.q_net_rev?.toFixed(2) || '0.00'}</p>
                </>
              )}
              {result.error && <p><strong>Error:</strong> {result.error}</p>}
              {result.data?.error && <p><strong>API Error:</strong> {result.data.error}</p>}

              {result.success && (
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="font-semibold mb-2">✅ Verify Sync Sheet:</p>
                  <a
                    href="https://docs.google.com/spreadsheets/d/1nZMTjsDydu2Dp8Vh621q88Wa-4blWG0elFWug8WXonk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    📊 Open Google Sheet (Sync Sheet)
                  </a>
                  <div className="text-sm mt-2 space-y-1">
                    <p><strong>Tab:</strong> {formData.group === 'sales' ? 'SEA_Sales' : 'SEA_CS'}</p>
                    <p><strong>Check Columns:</strong></p>
                    <ul className="list-disc ml-6 text-xs">
                      <li>A = Pipeline ID (UUID above)</li>
                      <li>C = Classification: "{formData.classification}"</li>
                      <li>D = POC: "{formData.poc}"</li>
                      <li>J = Domain: "{formData.domain}"</li>
                      <li>O = Description: "{formData.description}"</li>
                      <li>P = Product: "{formData.product}"</li>
                      <li>S = IMP: {formData.imp?.toLocaleString()}</li>
                      <li>T = eCPM: {formData.ecpm}</li>
                      <li>V = Revenue Share: {formData.revenue_share}%</li>
                      <li>X = Action Date: {formData.action_date}</li>
                      <li>Y = Next Action: "{formData.next_action}"</li>
                      <li>Z = Action Detail: "{formData.action_detail}"</li>
                      <li>AA = Action Progress: "{formData.action_progress}"</li>
                      <li>AC = Starting Date: {formData.starting_date}</li>
                      <li>AD = Status: "{formData.status}"</li>
                      <li>AE = Progress %: 30% (auto)</li>
                      <li>AF = Proposal Date: {formData.proposal_date}</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
