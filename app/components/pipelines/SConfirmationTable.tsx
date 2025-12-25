'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { Pipeline } from '@/lib/types/pipeline'
import { colors } from '@/lib/colors'
import { typography } from '@/lib/design-tokens'

interface SConfirmationTableProps {
  pipelines: Pipeline[]
  onConfirmComplete: () => void // Callback to refresh data
  onPipelineClick?: (pipeline: Pipeline) => void // Callback to open detail drawer
}

interface EnrichedPipeline extends Pipeline {
  expected_confirm_date: string
  days_overdue: number
  is_declined: boolean
}

export function SConfirmationTable({ pipelines, onConfirmComplete, onPipelineClick }: SConfirmationTableProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [selectedPipeline, setSelectedPipeline] = useState<EnrichedPipeline | null>(null)
  const [action, setAction] = useState<'confirm' | 'decline'>('confirm')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter pipelines needing confirmation
  const pendingConfirmations = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return pipelines
      .filter(p => {
        // Must be in S- status
        if (p.status !== '【S-】') return false

        // Must have actual_starting_date
        if (!p.actual_starting_date) return false

        // Must be 7+ days old
        const startDate = new Date(p.actual_starting_date)
        startDate.setHours(0, 0, 0, 0)
        const expectedConfirmDate = new Date(startDate)
        expectedConfirmDate.setDate(expectedConfirmDate.getDate() + 7)

        if (expectedConfirmDate > today) return false

        // Must not be confirmed already
        if (p.s_confirmation_status === 'confirmed') return false

        return true
      })
      .map(p => {
        const startDate = new Date(p.actual_starting_date!)
        const expectedDate = new Date(startDate)
        expectedDate.setDate(expectedDate.getDate() + 7)

        const daysDiff = Math.floor(
          (today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
          ...p,
          expected_confirm_date: expectedDate.toISOString().split('T')[0],
          days_overdue: daysDiff,
          is_declined: p.s_confirmation_status === 'declined'
        }
      })
      .sort((a, b) => b.days_overdue - a.days_overdue) // Most overdue first
  }, [pipelines])

  const handleOpenConfirmDialog = (pipeline: EnrichedPipeline, actionType: 'confirm' | 'decline') => {
    setSelectedPipeline(pipeline)
    setAction(actionType)
    setNotes('')
    setError(null)
    setConfirmDialogOpen(true)
  }

  const handleSubmitConfirmation = async () => {
    if (!selectedPipeline) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/pipelines/${selectedPipeline.id}/confirm-s-transition`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            notes: notes.trim() || undefined
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit confirmation')
      }

      // Success - close dialog and refresh
      setConfirmDialogOpen(false)
      onConfirmComplete()

    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  // Don't render if no confirmations needed
  if (pendingConfirmations.length === 0) {
    return null
  }

  return (
    <>
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
            className="font-semibold mb-3"
            style={{
              fontSize: typography.sizes.sectionTitle,
              color: colors.main
            }}
          >
            S- Confirmation Pending ({pendingConfirmations.length})
          </h3>

          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            <table className="w-full border-collapse">
              <thead
                className="sticky top-0 shadow-sm"
                style={{
                  zIndex: 20,
                  backgroundColor: colors.main
                }}
              >
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th
                    className="px-2 py-2 font-semibold leading-tight"
                    style={{
                      fontSize: typography.sizes.filterHeader,
                      color: colors.text.inverse,
                      textAlign: 'left'
                    }}
                  >
                    <span className="whitespace-nowrap">Publisher</span>
                  </th>
                  <th
                    className="px-2 py-2 font-semibold leading-tight"
                    style={{
                      fontSize: typography.sizes.filterHeader,
                      color: colors.text.inverse,
                      textAlign: 'left'
                    }}
                  >
                    <span className="whitespace-nowrap">POC</span>
                  </th>
                  <th
                    className="px-2 py-2 font-semibold leading-tight"
                    style={{
                      fontSize: typography.sizes.filterHeader,
                      color: colors.text.inverse,
                      textAlign: 'left'
                    }}
                  >
                    <span className="whitespace-nowrap">Started</span>
                  </th>
                  <th
                    className="px-2 py-2 font-semibold leading-tight"
                    style={{
                      fontSize: typography.sizes.filterHeader,
                      color: colors.text.inverse,
                      textAlign: 'left'
                    }}
                  >
                    <span className="whitespace-nowrap">Expected Confirm</span>
                  </th>
                  <th
                    className="px-2 py-2 font-semibold leading-tight"
                    style={{
                      fontSize: typography.sizes.filterHeader,
                      color: colors.text.inverse,
                      textAlign: 'right'
                    }}
                  >
                    <span className="whitespace-nowrap">Days Overdue</span>
                  </th>
                  <th
                    className="px-2 py-2 font-semibold leading-tight"
                    style={{
                      fontSize: typography.sizes.filterHeader,
                      color: colors.text.inverse,
                      textAlign: 'center'
                    }}
                  >
                    <span className="whitespace-nowrap">Status</span>
                  </th>
                  <th
                    className="px-2 py-2 font-semibold leading-tight"
                    style={{
                      fontSize: typography.sizes.filterHeader,
                      color: colors.text.inverse,
                      textAlign: 'center'
                    }}
                  >
                    <span className="whitespace-nowrap">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingConfirmations.map((pipeline, idx) => (
                  <tr
                    key={pipeline.id}
                    className="border-b border-slate-200 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f0f0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}
                    onClick={() => onPipelineClick?.(pipeline)}
                  >
                    <td
                      className="px-2 py-2 leading-tight font-medium"
                      style={{
                        fontSize: typography.sizes.dataPoint,
                        color: colors.text.primary
                      }}
                    >
                      {pipeline.publisher || 'Unnamed'}
                    </td>
                    <td
                      className="px-2 py-2 leading-tight"
                      style={{
                        fontSize: typography.sizes.dataPoint,
                        color: colors.text.primary
                      }}
                    >
                      {pipeline.poc || '-'}
                    </td>
                    <td
                      className="px-2 py-2 leading-tight"
                      style={{
                        fontSize: typography.sizes.dataPoint,
                        color: colors.text.primary
                      }}
                    >
                      {pipeline.actual_starting_date ? formatDate(pipeline.actual_starting_date) : '-'}
                    </td>
                    <td
                      className="px-2 py-2 leading-tight"
                      style={{
                        fontSize: typography.sizes.dataPoint,
                        color: colors.text.primary
                      }}
                    >
                      {formatDate(pipeline.expected_confirm_date)}
                    </td>
                    <td
                      className="px-2 py-2 leading-tight text-right"
                      style={{
                        fontSize: typography.sizes.dataPoint
                      }}
                    >
                      <span className="font-bold" style={{
                        color: pipeline.days_overdue > 14 ? colors.status.danger :
                               pipeline.days_overdue > 7 ? colors.status.warning :
                               colors.status.info
                      }}>
                        +{pipeline.days_overdue}d
                      </span>
                    </td>
                    <td className="px-2 py-2 leading-tight text-center">
                      {pipeline.is_declined ? (
                        <Badge variant="secondary" className="text-[10px]">Declined</Badge>
                      ) : (
                        <Badge variant="info-subtle" className="text-[10px]">Pending</Badge>
                      )}
                    </td>
                    <td className="px-2 py-2 leading-tight">
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs bg-[#1565C0] hover:bg-[#0D47A1] text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenConfirmDialog(pipeline, 'confirm')
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenConfirmDialog(pipeline, 'decline')
                          }}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'confirm' ? 'Confirm S- to S Transition' : 'Decline S- to S Transition'}
            </DialogTitle>
            <DialogDescription>
              {action === 'confirm' ? (
                <>
                  Publisher <strong>{selectedPipeline?.publisher}</strong> đã được{' '}
                  <strong>{selectedPipeline?.days_overdue}</strong> ngày. Có đổi thành S không?
                  <br /><br />
                  <strong>Confirming will:</strong>
                  <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                    <li>Change status from S- to S</li>
                    <li>Set <code>close_won_date</code> to <strong>TODAY</strong> ({new Date().toISOString().split('T')[0]})</li>
                    <li>Mark confirmation as completed</li>
                    <li>Remove from this confirmation list</li>
                  </ul>
                </>
              ) : (
                <>
                  Publisher <strong>{selectedPipeline?.publisher}</strong> will remain in S- status.
                  <br /><br />
                  The pipeline will stay in the confirmation list until you confirm it later.
                  You can add a note explaining why.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-danger bg-danger-bg p-3 text-sm text-danger">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder={action === 'confirm'
                  ? "Add any notes about this confirmation..."
                  : "Explain why you're declining (e.g., waiting for client feedback)..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={submitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitConfirmation}
              disabled={submitting}
              className={action === 'confirm' ? 'bg-[#1565C0] hover:bg-[#0D47A1] text-white' : ''}
            >
              {submitting ? 'Processing...' : action === 'confirm' ? 'Confirm S Transition' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
