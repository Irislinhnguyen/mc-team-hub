'use client'

import { useState } from 'react'
import { useSalesList } from '@/app/contexts/SalesListContext'
import { SalesListWithStats } from '@/lib/types/salesLists'
import { X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteListDialogProps {
  isOpen: boolean
  list: SalesListWithStats
  onClose: () => void
  onSuccess: () => void
}

export function DeleteListDialog({ isOpen, list, onClose, onSuccess }: DeleteListDialogProps) {
  const { deleteList } = useSalesList()
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen) return null

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      await deleteList(list.id)
      toast.success('List deleted successfully')
      onSuccess()
    } catch (error) {
      console.error('Error deleting list:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete list')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Delete List</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            Are you sure you want to delete <span className="font-semibold">{list.name}</span>?
          </p>
          <p className="mt-2">This action cannot be undone. The following will be permanently deleted:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>{list.total_items} item{list.total_items !== 1 ? 's' : ''}</li>
            <li>{list.total_contacts} activity log{list.total_contacts !== 1 ? 's' : ''}</li>
            <li>All associated data and history</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete List'}
          </button>
        </div>
      </div>
    </div>
  )
}
