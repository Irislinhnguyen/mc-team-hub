'use client'

import { useState, useEffect, useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Pipeline } from '@/lib/types/pipeline'
import { STATUS_PROGRESS_MAP } from '@/lib/services/statusProgressMapping'
import {
  POC_NAMES,
  CLASSIFICATION_TYPES,
  CHANNEL_TYPES,
  TEAMS,
  REGIONS,
  PRODUCT_TYPES,
  PIPELINE_STAGES,
  NEXT_ACTION_TYPES,
  ACTION_DETAIL_TYPES,
} from '@/lib/types/pipeline'
import { MonthlyForecastView } from './MonthlyForecastView'
import { ActivityLogView } from './ActivityLogView'
import { ActionHistoryList } from './ActionHistoryList'
import { Separator } from '@/components/ui/separator'

// Zero revenue status constants
const ZERO_REVENUE_STATUSES = ['【D】', '【E】', '【F】']

interface PipelineDetailDrawerProps {
  pipeline: Pipeline | null
  open: boolean
  onClose: () => void
  onSave: (updates: Partial<Pipeline>) => Promise<void>
  pocNames?: string[] // Dynamic POC names from API
}

export function PipelineDetailDrawer({ pipeline, open, onClose, onSave, pocNames }: PipelineDetailDrawerProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Pipeline>>(pipeline || {})
  const [originalData, setOriginalData] = useState<Partial<Pipeline>>(pipeline || {})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [showCustomPoc, setShowCustomPoc] = useState(false)
  const [customPoc, setCustomPoc] = useState('')
  const [showCustomProduct, setShowCustomProduct] = useState(false)
  const [customProduct, setCustomProduct] = useState('')

  // Update form data when pipeline changes
  useEffect(() => {
    if (pipeline) {
      setFormData(pipeline)
      setOriginalData(pipeline)
      setHasUnsavedChanges(false)
    }
  }, [pipeline?.id])

  // Check if form data has changed
  const hasChanges = useMemo(() => {
    if (!originalData) return false

    // Compare all relevant fields
    const fieldsToCompare = [
      'imp', 'ecpm', 'revenue_share', 'starting_date', 'status',
      'publisher', 'poc', 'classification', 'team', 'pid', 'mid',
      'affected_zones', 'domain', 'channel', 'region', 'product', 'proposal_date',
      'interested_date', 'acceptance_date', 'action_date',
      'next_action', 'action_detail', 'action_progress', 'forecast_type'
    ]

    return fieldsToCompare.some(field => {
      const original = originalData[field as keyof Pipeline]
      const current = formData[field as keyof Pipeline]

      // Handle null/undefined/empty string as equivalent
      // Also handle string/number comparison for numeric fields
      const normalizeValue = (val: any) => {
        if (val === null || val === undefined || val === '') return null
        // Convert string numbers to numbers for comparison
        if (typeof val === 'string' && !isNaN(parseFloat(val))) {
          return parseFloat(val)
        }
        return val
      }

      return normalizeValue(original) !== normalizeValue(current)
    })
  }, [formData, originalData])

  // Update hasUnsavedChanges state whenever hasChanges changes
  useEffect(() => {
    setHasUnsavedChanges(hasChanges)
  }, [hasChanges])

  // Real-time calculations based on formData following Google Sheet formula
  const calculatedValues = useMemo(() => {
    // Parse input values
    const imp = formData.imp ?? pipeline?.imp ?? 0
    const ecpmValue = formData.ecpm ?? pipeline?.ecpm ?? 0
    const revenueShareValue = formData.revenue_share ?? pipeline?.revenue_share ?? 0
    const status = formData.status ?? pipeline?.status ?? '【C-】'

    // Convert to numbers, handling string inputs
    const ecpm = typeof ecpmValue === 'string' ? parseFloat(ecpmValue) || 0 : ecpmValue
    const revenue_share = typeof revenueShareValue === 'string' ? parseFloat(revenueShareValue) || 0 : revenueShareValue

    // Step 1: Calculate base rates
    const max_gross = (!isNaN(imp) && !isNaN(ecpm))
      ? (imp / 1000) * ecpm
      : 0

    const day_gross = !isNaN(max_gross) ? max_gross / 30 : 0
    const day_net_rev = (!isNaN(day_gross) && !isNaN(revenue_share))
      ? day_gross * revenue_share
      : 0

    // Step 2: Check if status requires zero revenue
    const isZeroRevenue = ZERO_REVENUE_STATUSES.includes(status)

    // Step 3: Get progress multiplier from status (Google Sheet VLOOKUP)
    const progress_percent = STATUS_PROGRESS_MAP[status] ?? 50
    const progressMultiplier = progress_percent / 100

    // Step 4: Calculate quarterly revenue following Google Sheet formula
    // Formula: Q Gross = SUM(3 months) where Monthly = day_gross × progress% × delivery_days
    let q_gross = 0
    let q_net_rev = 0

    // Check if user has unsaved changes (for real-time calculation)
    const hasUnsavedChanges =
      formData.imp !== pipeline?.imp ||
      formData.ecpm !== pipeline?.ecpm ||
      formData.revenue_share !== pipeline?.revenue_share ||
      formData.status !== pipeline?.status

    if (!isZeroRevenue) {
      if (hasUnsavedChanges) {
        // USER IS EDITING → Recalculate using current formData values (real-time preview)
        const monthlyForecasts = pipeline?.monthly_forecasts || []
        if (monthlyForecasts.length > 0) {
          // Use delivery_days from forecasts for accuracy
          q_gross = monthlyForecasts.reduce((sum, forecast) => {
            const deliveryDays = forecast.delivery_days ?? 30
            return sum + (day_gross * progressMultiplier * deliveryDays)
          }, 0)

          q_net_rev = monthlyForecasts.reduce((sum, forecast) => {
            const deliveryDays = forecast.delivery_days ?? 30
            return sum + (day_net_rev * progressMultiplier * deliveryDays)
          }, 0)
        } else {
          // No forecasts → Default calculation
          const monthlyGross = day_gross * progressMultiplier * 30
          const monthlyNet = day_net_rev * progressMultiplier * 30
          q_gross = monthlyGross * 3
          q_net_rev = monthlyNet * 3
        }
      } else {
        // NO UNSAVED CHANGES → Use DB values directly (single source of truth)
        q_gross = pipeline?.q_gross ?? 0
        q_net_rev = pipeline?.q_net_rev ?? 0
      }
    }
    // else: isZeroRevenue = true, q_gross and q_net_rev stay 0

    return {
      max_gross,
      day_gross,
      day_net_rev,
      q_gross,
      q_net_rev,
    }
  }, [
    formData.imp,
    formData.ecpm,
    formData.revenue_share,
    formData.status,
    pipeline?.imp,
    pipeline?.ecpm,
    pipeline?.revenue_share,
    pipeline?.status,
    pipeline?.monthly_forecasts,
  ])

  const handleSave = async () => {
    if (!pipeline) return

    // ===== VALIDATE REQUIRED FIELDS =====
    if (!formData.proposal_date) {
      console.error('proposal_date is required')
      // TODO: Show toast notification
      alert('Proposal Date is required')
      return
    }

    if (!formData.starting_date) {
      console.error('starting_date (projection) is required')
      // TODO: Show toast notification
      alert('Starting Date (Projection) is required')
      return
    }

    setSaving(true)
    try {
      // Convert string values to numbers before saving
      const dataToSave = {
        ...formData,
        ecpm: typeof formData.ecpm === 'string' ? parseFloat(formData.ecpm) || null : formData.ecpm,
        revenue_share: typeof formData.revenue_share === 'string' ? parseFloat(formData.revenue_share) || null : formData.revenue_share,
      }

      await onSave(dataToSave)
      setOriginalData(dataToSave) // Update original to current
      setHasUnsavedChanges(false) // Reset dirty flag

      // Don't close drawer after save - let user see the updated data and action history
      // User will manually close when done
    } catch (error) {
      console.error('Failed to save pipeline:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true) // Show warning dialog
    } else {
      onClose() // No changes, close immediately
    }
  }

  const formatValue = (value: number | string | null) => {
    if (value === null || value === undefined) return '$0'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num) || num === 0) return '$0'
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  if (!pipeline) return null

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose() // Use our custom close handler
      }
    }}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">
            {pipeline.publisher || 'Pipeline Details'}
          </SheetTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{pipeline.status}</Badge>
            <Badge variant="outline">{pipeline.group}</Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Input Fields */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-[#1565C0]">
                Inputs
              </h3>

              {/* Row 1: Request, eCPM, Revenue Share */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="imp" className="text-xs">Request</Label>
                  <Input
                    id="imp"
                    type="text"
                    inputMode="numeric"
                    value={formData.imp ? formData.imp.toLocaleString() : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '')
                      if (value === '' || /^\d+$/.test(value)) {
                        setFormData({
                          ...formData,
                          imp: value ? parseInt(value) : null
                        })
                      }
                    }}
                    className="mt-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="1,000,000"
                  />
                </div>
                <div>
                  <Label htmlFor="ecpm" className="text-xs">eCPM</Label>
                  <Input
                    id="ecpm"
                    type="text"
                    inputMode="decimal"
                    value={formData.ecpm ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty, digits, single decimal point, and decimals
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData({
                          ...formData,
                          ecpm: value === '' ? null : value
                        })
                      }
                    }}
                    className="mt-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="2.50"
                  />
                </div>
                <div>
                  <Label htmlFor="revenue_share" className="text-xs">Revenue Share %</Label>
                  <Input
                    id="revenue_share"
                    type="text"
                    inputMode="numeric"
                    value={formData.revenue_share ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty, digits, and decimals
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        // Validate range only for complete numbers
                        const num = parseFloat(value)
                        if (value === '' || value.endsWith('.') || (num >= 0 && num <= 100)) {
                          setFormData({
                            ...formData,
                            revenue_share: value === '' ? null : value
                          })
                        }
                      }
                    }}
                    className="mt-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="70"
                  />
                </div>
              </div>

              {/* Row 2: Starting Date & Status */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label htmlFor="starting_date" className="text-xs">Starting Date</Label>
                  <Input
                    id="starting_date"
                    type="date"
                    value={formData.starting_date || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      starting_date: e.target.value || null
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-xs">Status</Label>
                  <Select
                    value={formData.status || ''}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((stage) => (
                        <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Auto-Calculated Fields (Read-Only) */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                Auto-Calculated
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 p-3 rounded border">
                  <div className="text-xs text-muted-foreground">Max Gross</div>
                  <div className="text-sm font-bold">{formatValue(calculatedValues.max_gross)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">= (Request/1000) × eCPM</div>
                </div>
                <div className="bg-muted/50 p-3 rounded border">
                  <div className="text-xs text-muted-foreground">Day Gross</div>
                  <div className="text-sm font-bold">{formatValue(calculatedValues.day_gross)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">= Max Gross / 30</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-muted/50 p-3 rounded border">
                  <div className="text-xs text-muted-foreground">Day Net Rev</div>
                  <div className="text-sm font-bold">{formatValue(calculatedValues.day_net_rev)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">= Day Gross × Rev%</div>
                </div>
                <div className="bg-muted/50 p-3 rounded border">
                  <div className="text-xs text-muted-foreground">Q Gross</div>
                  <div className="text-sm font-bold">{formatValue(calculatedValues.q_gross)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">= Sum of 3 months</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 mt-3">
                <div className="bg-muted/50 p-3 rounded border">
                  <div className="text-xs text-muted-foreground">Q Net Rev</div>
                  <div className="text-sm font-bold">{formatValue(calculatedValues.q_net_rev)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">= Sum of 3 months</div>
                </div>
              </div>
            </div>

            {/* Details Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Details</h3>

              <div>
                <Label htmlFor="publisher" className="text-xs">Publisher *</Label>
                <Input
                  id="publisher"
                  placeholder="Publisher name"
                  value={formData.publisher || ''}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pid" className="text-xs">PID</Label>
                  <Input
                    id="pid"
                    placeholder="Publisher ID"
                    value={formData.pid || ''}
                    onChange={(e) => setFormData({ ...formData, pid: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mid" className="text-xs">MID</Label>
                  <Input
                    id="mid"
                    placeholder="Media ID"
                    value={formData.mid || ''}
                    onChange={(e) => setFormData({ ...formData, mid: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Affected Zones (Manual Input for MVP) */}
              <div>
                <Label htmlFor="affected_zones" className="text-xs">Affected Zones (ZID, comma-separated)</Label>
                <Input
                  id="affected_zones"
                  placeholder="123, 456, 789"
                  value={formData.affected_zones?.join(', ') || ''}
                  onChange={(e) => {
                    const zones = e.target.value
                      .split(',')
                      .map(z => z.trim())
                      .filter(z => z !== '')
                    setFormData({ ...formData, affected_zones: zones })
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter zone IDs separated by commas (e.g., 123, 456, 789)
                </p>
              </div>

              <div>
                <Label htmlFor="domain" className="text-xs">Domain</Label>
                <Input
                  id="domain"
                  value={formData.domain || ''}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="poc" className="text-xs">POC *</Label>
                  <Select
                    value={formData.poc === customPoc && customPoc ? 'Other (specify)' : (formData.poc || '')}
                    onValueChange={(value) => {
                      if (value === 'Other (specify)') {
                        setShowCustomPoc(true)
                        setFormData({ ...formData, poc: '' })
                      } else {
                        setShowCustomPoc(false)
                        setCustomPoc('')
                        setFormData({ ...formData, poc: value })
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select POC" />
                    </SelectTrigger>
                    <SelectContent>
                      {(pocNames || POC_NAMES).map((poc) => (
                        <SelectItem key={poc} value={poc}>
                          {poc}
                        </SelectItem>
                      ))}
                      <SelectItem value="Other (specify)">Other (specify)</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomPoc && (
                    <Input
                      placeholder="Enter custom POC name"
                      value={customPoc}
                      onChange={(e) => {
                        setCustomPoc(e.target.value)
                        setFormData({ ...formData, poc: e.target.value })
                      }}
                      className="mt-2"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="product" className="text-xs">Product</Label>
                  <Select
                    value={formData.product === customProduct && customProduct ? 'other' : (formData.product || '')}
                    onValueChange={(value) => {
                      if (value === 'other') {
                        setShowCustomProduct(true)
                        setFormData({ ...formData, product: '' })
                      } else {
                        setShowCustomProduct(false)
                        setCustomProduct('')
                        setFormData({ ...formData, product: value })
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((product) => (
                        <SelectItem key={product} value={product}>
                          {product}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showCustomProduct && (
                    <Input
                      placeholder="Enter custom product type"
                      value={customProduct}
                      onChange={(e) => {
                        setCustomProduct(e.target.value)
                        setFormData({ ...formData, product: e.target.value })
                      }}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="classification" className="text-xs">Classification</Label>
                <Select
                  value={formData.classification || ''}
                  onValueChange={(value) => setFormData({ ...formData, classification: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Classification" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATION_TYPES.map((classification) => (
                      <SelectItem key={classification} value={classification}>
                        {classification}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Timeline</h3>

              {/* Required Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="proposal_date" className="text-xs">
                    Proposal Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="proposal_date"
                    type="date"
                    value={formData.proposal_date || ''}
                    onChange={(e) => setFormData({ ...formData, proposal_date: e.target.value })}
                    className={`mt-1 ${!formData.proposal_date ? 'border-red-300' : ''}`}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="starting_date" className="text-xs">
                    Starting Date (Projection) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="starting_date"
                    type="date"
                    value={formData.starting_date || ''}
                    onChange={(e) => setFormData({ ...formData, starting_date: e.target.value })}
                    className={`mt-1 ${!formData.starting_date ? 'border-red-300' : ''}`}
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    For delivery days calculation
                  </p>
                </div>
              </div>

              {/* Auto-Logged Milestone Dates */}
              <Separator className="my-2" />
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">
                  Status Milestones (Auto-Logged)
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Interested Date</Label>
                    <Input
                      type="date"
                      value={pipeline.interested_date || ''}
                      readOnly
                      disabled
                      className="mt-1 bg-muted/50 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Set when status → C/C-</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Acceptance Date</Label>
                    <Input
                      type="date"
                      value={pipeline.acceptance_date || ''}
                      readOnly
                      disabled
                      className="mt-1 bg-muted/50 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Set when status → B</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Ready to Deliver</Label>
                    <Input
                      type="date"
                      value={pipeline.ready_to_deliver_date || ''}
                      readOnly
                      disabled
                      className="mt-1 bg-muted/50 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Set when status → A</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Actual Starting</Label>
                    <Input
                      type="date"
                      value={pipeline.actual_starting_date || ''}
                      readOnly
                      disabled
                      className="mt-1 bg-muted/50 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Set when status → S-</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Close Won Date</Label>
                    <Input
                      type="date"
                      value={pipeline.close_won_date || ''}
                      readOnly
                      disabled
                      className="mt-1 bg-muted/50 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Set when status → S (actual + 7)</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date || ''}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="mt-1"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Optional</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions & Notes */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Actions & Notes</h3>

              <div>
                <Label htmlFor="action_date" className="text-xs">Action Date</Label>
                <Input
                  id="action_date"
                  type="date"
                  value={formData.action_date || ''}
                  onChange={(e) => setFormData({ ...formData, action_date: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="next_action" className="text-xs">Next Action</Label>
                <Select
                  value={formData.next_action || ''}
                  onValueChange={(value) => setFormData({ ...formData, next_action: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select next action" />
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
                <Label htmlFor="action_detail" className="text-xs">Action Details</Label>
                <Select
                  value={formData.action_detail || ''}
                  onValueChange={(value) => setFormData({ ...formData, action_detail: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select action detail" />
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
                <Label htmlFor="action_progress" className="text-xs">Progress Notes</Label>
                <Textarea
                  id="action_progress"
                  value={formData.action_progress || ''}
                  onChange={(e) => setFormData({ ...formData, action_progress: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Pipeline description..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Action History Section */}
              <Separator className="my-4" />
              <ActionHistoryList pipelineId={pipeline.id} />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !hasUnsavedChanges} className="flex-1 bg-[#1565C0] hover:bg-[#0D47A1]">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </TabsContent>

          {/* Monthly Tab */}
          <TabsContent value="monthly" className="space-y-4">
            <MonthlyForecastView pipeline={pipeline} />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <ActivityLogView pipelineId={pipeline.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>

      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to save them before closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUnsavedWarning(false)
              // Don't close drawer, just close warning
            }}>
              Continue Editing
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                setShowUnsavedWarning(false)
                setFormData(originalData) // Reset form
                setHasUnsavedChanges(false)
                onClose() // Close drawer without saving
              }}
            >
              Discard Changes
            </Button>
            <AlertDialogAction
              onClick={async () => {
                setShowUnsavedWarning(false)
                await handleSave() // Save then close
              }}
            >
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
