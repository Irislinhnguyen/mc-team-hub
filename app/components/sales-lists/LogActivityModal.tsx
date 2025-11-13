'use client'

import { useState } from 'react'
import { useSalesList } from '@/contexts/SalesListContext'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { ACTIVITY_TYPES, CONTACT_OUTCOMES, RESPONSE_OUTCOMES, CLOSED_STATUSES } from './statusUtils'

interface LogActivityModalProps {
  isOpen: boolean
  listId: string
  itemId: string
  onClose: () => void
  onSuccess: () => void
}

export function LogActivityModal({ isOpen, listId, itemId, onClose, onSuccess }: LogActivityModalProps) {
  const { logActivity } = useSalesList()
  const [activityType, setActivityType] = useState('contact')
  const [contactTime, setContactTime] = useState(new Date().toISOString().slice(0, 16))
  const [contactOutcome, setContactOutcome] = useState('contacted')
  const [responseOutcome, setResponseOutcome] = useState('')
  const [responseTime, setResponseTime] = useState('')
  const [closedStatus, setClosedStatus] = useState('')
  const [dealValue, setDealValue] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)

    try {
      await logActivity(listId, itemId, {
        list_item_id: itemId,
        activity_type: activityType as any,
        contact_time: new Date(contactTime).toISOString(),
        response_time: responseTime ? new Date(responseTime).toISOString() : undefined,
        contact_outcome: contactOutcome || undefined,
        response_outcome: responseOutcome || undefined,
        closed_status: closedStatus as any || undefined,
        deal_value: dealValue ? parseFloat(dealValue) : undefined,
        notes: notes.trim() || undefined,
      })

      toast.success('Activity logged successfully')
      onSuccess()
      onClose()

      // Reset form
      setActivityType('contact')
      setContactTime(new Date().toISOString().slice(0, 16))
      setContactOutcome('contacted')
      setResponseOutcome('')
      setResponseTime('')
      setClosedStatus('')
      setDealValue('')
      setNotes('')
    } catch (error) {
      console.error('Error logging activity:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to log activity')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Log Activity</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Activity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Activity Type</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contact Time
            </label>
            <input
              type="datetime-local"
              value={contactTime}
              onChange={(e) => setContactTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {/* Contact Outcome */}
          {activityType === 'contact' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Type</label>
              <select
                value={contactOutcome}
                onChange={(e) => setContactOutcome(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {CONTACT_OUTCOMES.map((outcome) => (
                  <option key={outcome.value} value={outcome.value}>
                    {outcome.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Response Outcome */}
          {activityType === 'response' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Response Type</label>
              <select
                value={responseOutcome}
                onChange={(e) => setResponseOutcome(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select response type</option>
                {RESPONSE_OUTCOMES.map((outcome) => (
                  <option key={outcome.value} value={outcome.value}>
                    {outcome.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Response Time */}
          {responseOutcome && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Response Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={responseTime}
                onChange={(e) => setResponseTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to use contact time as response time
              </p>
            </div>
          )}

          {/* Closed Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Deal Status (Optional)
            </label>
            <select
              value={closedStatus}
              onChange={(e) => setClosedStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No status change</option>
              {CLOSED_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Deal Value */}
          {closedStatus === 'closed_won' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Deal Value (USD)
              </label>
              <input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="e.g., 50000"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details about this interaction..."
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Logging...' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
