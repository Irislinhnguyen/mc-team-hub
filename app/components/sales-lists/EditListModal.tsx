'use client'

import { useState, useEffect } from 'react'
import { useSalesList } from '@/app/contexts/SalesListContext'
import { SalesList } from '@/lib/types/salesLists'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface EditListModalProps {
  isOpen: boolean
  list: SalesList
  onClose: () => void
}

const PRESET_COLORS = [
  '#1565C0',
  '#2E7D32',
  '#C62828',
  '#F57C00',
  '#6A1B9A',
  '#00838F',
  '#AD1457',
  '#4E342E',
]

export function EditListModal({ isOpen, list, onClose }: EditListModalProps) {
  const { updateList } = useSalesList()
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description || '')
  const [color, setColor] = useState(list.color)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setName(list.name)
    setDescription(list.description || '')
    setColor(list.color)
  }, [list])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Please enter a list name')
      return
    }

    setIsSubmitting(true)

    try {
      await updateList(list.id, {
        name: name.trim(),
        description: description.trim() || null,
        color,
      })

      toast.success('List updated successfully')
      onClose()
    } catch (error) {
      console.error('Error updating list:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update list')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit List</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              List Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">List Color</label>
            <div className="mt-2 flex gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`h-8 w-8 rounded-full transition-transform ${
                    color === presetColor ? 'scale-110 ring-2 ring-gray-400 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
          </div>

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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
