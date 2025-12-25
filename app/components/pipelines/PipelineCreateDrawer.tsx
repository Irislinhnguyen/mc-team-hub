'use client'

import { useState, useEffect, useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
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
import {
  POC_NAMES,
  CLASSIFICATION_TYPES,
  PRODUCT_TYPES,
  PIPELINE_STAGES,
  NEXT_ACTION_TYPES,
  type CreatePipelineInput,
  type PipelineGroup,
} from '@/lib/types/pipeline'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface PipelineCreateDrawerProps {
  open: boolean
  onClose: () => void
  onCreate: (data: CreatePipelineInput) => Promise<void>
  activeGroup: PipelineGroup
  pocNames?: string[] // Dynamic POC names from API
}

export function PipelineCreateDrawer({ open, onClose, onCreate, activeGroup, pocNames }: PipelineCreateDrawerProps) {
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<Partial<CreatePipelineInput>>({})
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    additionalDetails: false,
    timeline: false,
  })

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setFormData({})
      setAttemptedSubmit(false)
      setExpandedSections({
        additionalDetails: false,
        timeline: false,
      })
    }
  }, [open])

  // Check if form has any data
  const hasFormData = useMemo(() => {
    return Object.keys(formData).some(key => {
      const value = formData[key as keyof typeof formData]
      return value !== undefined && value !== null && value !== ''
    })
  }, [formData])

  // Validation - check required fields
  const isValid = useMemo(() => {
    return !!(
      formData.publisher &&
      formData.poc &&
      formData.starting_date &&
      formData.proposal_date
    )
  }, [formData.publisher, formData.poc, formData.starting_date, formData.proposal_date])

  // Real-time calculation preview
  const calculatedPreview = useMemo(() => {
    const imp = formData.imp ?? 0
    const ecpm = formData.ecpm ?? 0
    const revenue_share = formData.revenue_share ?? 0

    if (!imp || !ecpm || !revenue_share) return null

    const max_gross = (imp / 1000) * ecpm
    const day_gross = max_gross / 30
    const day_net_rev = day_gross * (revenue_share / 100)

    return {
      max_gross,
      day_net_rev,
    }
  }, [formData.imp, formData.ecpm, formData.revenue_share])

  const handleClose = () => {
    if (hasFormData) {
      setShowUnsavedWarning(true)
    } else {
      onClose()
    }
  }

  const handleDiscardAndClose = () => {
    setShowUnsavedWarning(false)
    setFormData({})
    onClose()
  }

  const handleCreate = async () => {
    setAttemptedSubmit(true)

    if (!isValid) {
      return
    }

    setCreating(true)
    try {
      const data: CreatePipelineInput = {
        publisher: formData.publisher!,
        poc: formData.poc!,
        group: activeGroup,
        ...formData,
      }
      await onCreate(data)
      setFormData({})
      setAttemptedSubmit(false)
      onClose()
    } catch (error) {
      console.error('Failed to create pipeline:', error)
    } finally {
      setCreating(false)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
      }}>
        <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Create New Pipeline</SheetTitle>
              <Badge variant={activeGroup === 'sales' ? 'default' : 'secondary'}>
                {activeGroup === 'sales' ? 'Sales' : 'CS'}
              </Badge>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Section 1: Basic Info (Required) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1565C0]">Basic Info</h3>

              <div className="space-y-3">
                {/* Row 1: PID and MID - Simple text inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="pid">PID (Publisher ID)</Label>
                    <Input
                      id="pid"
                      value={formData.pid || ''}
                      onChange={(e) => setFormData({ ...formData, pid: e.target.value })}
                      placeholder="Enter PID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mid">MID (Media ID)</Label>
                    <Input
                      id="mid"
                      value={formData.mid || ''}
                      onChange={(e) => setFormData({ ...formData, mid: e.target.value })}
                      placeholder="Enter MID"
                    />
                  </div>
                </div>

                {/* Row 2: Publisher Name */}
                <div>
                  <Label htmlFor="publisher">
                    Publisher Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="publisher"
                    value={formData.publisher || ''}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    placeholder="Enter publisher name"
                  />
                  {attemptedSubmit && !formData.publisher && (
                    <p className="text-xs text-red-600 mt-1">Publisher name is required</p>
                  )}
                </div>

                {/* Row 3: Media Name */}
                <div>
                  <Label htmlFor="medianame">Media Name</Label>
                  <Input
                    id="medianame"
                    value={formData.medianame || ''}
                    onChange={(e) => setFormData({ ...formData, medianame: e.target.value })}
                    placeholder="Enter media name (optional)"
                  />
                </div>

                {/* Row 4: Domain (always manual input for website URL) */}
                <div>
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    value={formData.domain || ''}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="e.g. example.com"
                  />
                </div>

                {/* Row 5: POC */}
                <div>
                  <Label htmlFor="poc">
                    POC <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.poc}
                    onValueChange={(value) => setFormData({ ...formData, poc: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select POC" />
                    </SelectTrigger>
                    <SelectContent>
                      {(pocNames || POC_NAMES).map((poc) => (
                        <SelectItem key={poc} value={poc}>
                          {poc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {attemptedSubmit && !formData.poc && (
                    <p className="text-xs text-red-600 mt-1">POC is required</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Revenue Inputs & Timeline */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1565C0]">Revenue Inputs & Timeline</h3>

              {/* Row 1: Request - Full width */}
              <div>
                <Label htmlFor="imp">Request (Imp/30d)</Label>
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
                        imp: value ? parseInt(value) : undefined
                      })
                    }
                  }}
                  placeholder="e.g. 1,000,000"
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* Row 2: eCPM and Rev Share */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ecpm">eCPM</Label>
                  <Input
                    id="ecpm"
                    type="text"
                    inputMode="decimal"
                    value={formData.ecpm ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData({
                          ...formData,
                          ecpm: value ? parseFloat(value) : undefined
                        })
                      }
                    }}
                    placeholder="e.g. 2.50"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div>
                  <Label htmlFor="revenue_share">Rev Share (%)</Label>
                  <Input
                    id="revenue_share"
                    type="text"
                    inputMode="numeric"
                    value={formData.revenue_share ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        const num = parseFloat(value)
                        if (value === '' || (num >= 0 && num <= 100)) {
                          setFormData({
                            ...formData,
                            revenue_share: value ? num : undefined
                          })
                        }
                      }
                    }}
                    placeholder="e.g. 50"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {formData.revenue_share !== undefined &&
                   (formData.revenue_share < 0 || formData.revenue_share > 100) && (
                    <p className="text-xs text-red-600 mt-1">Must be 0-100</p>
                  )}
                </div>
              </div>

              {/* Row 3: Projected Starting Date and Proposal Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="starting_date">
                    Projected Starting Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="starting_date"
                    type="date"
                    value={formData.starting_date || ''}
                    onChange={(e) => setFormData({ ...formData, starting_date: e.target.value })}
                  />
                  {attemptedSubmit && !formData.starting_date && (
                    <p className="text-xs text-red-600 mt-1">Starting date is required</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="proposal_date">
                    Proposal Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="proposal_date"
                    type="date"
                    value={formData.proposal_date || ''}
                    onChange={(e) => setFormData({ ...formData, proposal_date: e.target.value })}
                  />
                  {attemptedSubmit && !formData.proposal_date && (
                    <p className="text-xs text-red-600 mt-1">Proposal date is required</p>
                  )}
                </div>
              </div>

              {/* Row 4: Status (optional) */}
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
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

              {/* Real-time Preview */}
              {calculatedPreview && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-xs font-semibold text-blue-900 mb-2">Preview</p>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. Max Gross:</span>
                      <span className="font-medium">
                        ${calculatedPreview.max_gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Day Net:</span>
                      <span className="font-medium">
                        ${calculatedPreview.day_net_rev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Section 3: Additional Details (Optional, Collapsible) */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => toggleSection('additionalDetails')}
                className="w-full flex items-center justify-between text-sm font-semibold text-[#1565C0] hover:text-[#0D47A1] transition-colors"
              >
                <span>Additional Details (Optional)</span>
                {expandedSections.additionalDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {expandedSections.additionalDetails && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="product">Product</Label>
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

                    <div>
                      <Label htmlFor="classification">Classification</Label>
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
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Section 4: Timeline (Optional, Collapsible) */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => toggleSection('timeline')}
                className="w-full flex items-center justify-between text-sm font-semibold text-[#1565C0] hover:text-[#0D47A1] transition-colors"
              >
                <span>Timeline & Actions (Optional)</span>
                {expandedSections.timeline ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {expandedSections.timeline && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div>
                    <Label htmlFor="action_date">Action Date</Label>
                    <Input
                      id="action_date"
                      type="date"
                      value={formData.action_date || ''}
                      onChange={(e) => setFormData({ ...formData, action_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="next_action">Next Action</Label>
                    <Select
                      value={formData.next_action || ''}
                      onValueChange={(value) => setFormData({ ...formData, next_action: value })}
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t sticky bottom-0 bg-white">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!isValid || creating}
              className="bg-[#1565C0] hover:bg-[#0D47A1]"
            >
              {creating ? 'Creating...' : 'Create Pipeline'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Warning */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have entered data that will be lost if you close this form. Are you sure you want to discard these changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedWarning(false)}>
              Continue Editing
            </AlertDialogCancel>
            <Button variant="destructive" onClick={handleDiscardAndClose}>
              Discard Changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
