'use client'

import { useState } from 'react'
import { useSalesList } from '@/contexts/SalesListContext'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface ShareListModalProps {
  isOpen: boolean
  listId: string
  onClose: () => void
}

export function ShareListModal({ isOpen, listId, onClose }: ShareListModalProps) {
  const { shareList } = useSalesList()
  const [userEmail, setUserEmail] = useState('')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userEmail.trim()) {
      toast.error('Please enter a user email')
      return
    }

    setIsSubmitting(true)

    try {
      // Note: This requires looking up user by email first
      // For now, this is a placeholder - you'll need to add a lookup endpoint
      toast.info('Share functionality will be available after user lookup API is implemented')
      onClose()
    } catch (error) {
      console.error('Error sharing list:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to share list')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Share List</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700">
              User Email
            </label>
            <input
              type="email"
              id="userEmail"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Permission</label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="view"
                  checked={permission === 'view'}
                  onChange={(e) => setPermission(e.target.value as 'view')}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">View</span> - Can view list and activities
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="edit"
                  checked={permission === 'edit'}
                  onChange={(e) => setPermission(e.target.value as 'edit')}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">Edit</span> - Can add items and log activities
                </span>
              </label>
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
              {isSubmitting ? 'Sharing...' : 'Share List'}
            </button>
          </div>
        </form>

        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
          Note: User lookup endpoint needs to be implemented to convert email to user ID
        </div>
      </div>
    </div>
  )
}
