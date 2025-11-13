'use client'

import { useState } from 'react'
import { useSalesList } from '@/contexts/SalesListContext'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { ITEM_TYPES } from './statusUtils'

interface AddItemManualModalProps {
  isOpen: boolean
  listId: string
  onClose: () => void
  onSuccess: () => void
}

export function AddItemManualModal({ isOpen, listId, onClose, onSuccess }: AddItemManualModalProps) {
  const { addItems } = useSalesList()
  const [itemType, setItemType] = useState('domain_app_id')
  const [itemValue, setItemValue] = useState('')
  const [itemLabel, setItemLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!itemValue.trim()) {
      toast.error('Please enter an item value')
      return
    }

    setIsSubmitting(true)

    try {
      await addItems(listId, [
        {
          item_type: itemType as any,
          item_value: itemValue.trim(),
          item_label: itemLabel.trim() || undefined,
          source: 'manual',
          metadata: notes.trim() ? { notes: notes.trim() } : {},
        },
      ])

      toast.success('Item added successfully')
      onSuccess()
      onClose()
      setItemValue('')
      setItemLabel('')
      setNotes('')
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add item')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add Item Manually</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Item Type */}
          <div>
            <label htmlFor="itemType" className="block text-sm font-medium text-gray-700">
              Item Type
            </label>
            <select
              id="itemType"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ITEM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Item Value */}
          <div>
            <label htmlFor="itemValue" className="block text-sm font-medium text-gray-700">
              {itemType === 'domain_app_id' && 'Domain / App ID'}
              {itemType === 'domain' && 'Domain'}
              {itemType === 'pid' && 'Publisher ID (PID)'}
              {itemType === 'mid' && 'MID'}
              {itemType === 'publisher' && 'Publisher Name'}
              {itemType === 'custom' && 'Value'}
            </label>
            <input
              type="text"
              id="itemValue"
              value={itemValue}
              onChange={(e) => setItemValue(e.target.value)}
              placeholder={
                itemType === 'domain_app_id'
                  ? 'e.g., com.example.game'
                  : itemType === 'domain'
                  ? 'e.g., example.com'
                  : itemType === 'pid'
                  ? 'e.g., pub_123456'
                  : 'Enter value'
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {/* Item Label */}
          <div>
            <label htmlFor="itemLabel" className="block text-sm font-medium text-gray-700">
              Display Name (Optional)
            </label>
            <input
              type="text"
              id="itemLabel"
              value={itemLabel}
              onChange={(e) => setItemLabel(e.target.value)}
              placeholder="e.g., Example Game Studio"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why are you adding this item?"
              rows={3}
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
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
