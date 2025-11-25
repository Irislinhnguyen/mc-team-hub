'use client'

import { useState, useEffect } from 'react'
import { useSalesList } from '@/app/contexts/SalesListContext'
import { SalesListItemSummary, SalesListActivity } from '@/lib/types/salesLists'
import { X, Plus, Edit, Trash2, Calendar, User } from 'lucide-react'
import { LogActivityModal } from './LogActivityModal'
import { getStatusConfig } from './statusUtils'
import { toast } from 'sonner'

interface ItemDetailDrawerProps {
  isOpen: boolean
  listId: string
  item: SalesListItemSummary
  onClose: () => void
  onActivityLogged: () => void
}

export function ItemDetailDrawer({
  isOpen,
  listId,
  item,
  onClose,
  onActivityLogged,
}: ItemDetailDrawerProps) {
  const { fetchActivities, deleteActivity } = useSalesList()
  const [activities, setActivities] = useState<SalesListActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadActivities()
    }
  }, [isOpen, item.id])

  const loadActivities = async () => {
    setIsLoading(true)
    try {
      const fetchedActivities = await fetchActivities(listId, item.id)
      setActivities(fetchedActivities)
    } catch (error) {
      console.error('Error loading activities:', error)
      toast.error('Failed to load activities')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return

    try {
      await deleteActivity(listId, item.id, activityId)
      toast.success('Activity deleted')
      loadActivities()
      onActivityLogged()
    } catch (error) {
      console.error('Error deleting activity:', error)
      toast.error('Failed to delete activity')
    }
  }

  const handleActivityLogged = () => {
    loadActivities()
    onActivityLogged()
  }

  if (!isOpen) return null

  const statusConfig = getStatusConfig(item.current_status)

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-auto bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  {item.item_label || item.item_value}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
                >
                  {statusConfig.label}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-500">{item.item_value}</div>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span>{item.item_type}</span>
                <span>
                  {item.total_contacts} contact{item.total_contacts !== 1 ? 's' : ''}
                </span>
                {item.retarget_count > 0 && (
                  <span className={item.retarget_count >= 3 ? 'text-orange-600' : ''}>
                    {item.retarget_count} retarget{item.retarget_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <button
            onClick={() => setShowLogModal(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Log Activity
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Activity Timeline
          </h3>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          )}

          {!isLoading && activities.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500">
              No activities yet. Click "Log Activity" to add your first entry.
            </div>
          )}

          {!isLoading && activities.length > 0 && (
            <div className="mt-6 space-y-6">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative">
                  {/* Timeline line */}
                  {index !== activities.length - 1 && (
                    <div className="absolute left-4 top-10 h-full w-0.5 bg-gray-200" />
                  )}

                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                      {activity.activity_type === 'contact' && (
                        <Calendar size={16} className="text-gray-600" />
                      )}
                      {activity.activity_type === 'response' && (
                        <User size={16} className="text-gray-600" />
                      )}
                      {activity.activity_type === 'note' && (
                        <Edit size={16} className="text-gray-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Activity type and outcome */}
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {activity.activity_type === 'contact' && 'Contact Made'}
                              {activity.activity_type === 'response' && 'Response Received'}
                              {activity.activity_type === 'note' && 'Note Added'}
                            </span>
                            {activity.contact_outcome && (
                              <span className="text-xs text-gray-600">
                                ({activity.contact_outcome === 'retarget' && 'Retarget'}
                                {activity.contact_outcome === 'follow_up' && 'Follow-up'}
                                {activity.contact_outcome === 'contacted' && 'Initial'})
                              </span>
                            )}
                          </div>

                          {/* Outcome badge */}
                          {activity.response_outcome && (
                            <div className="mt-1">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  activity.response_outcome === 'positive'
                                    ? 'bg-green-100 text-green-800'
                                    : activity.response_outcome === 'negative'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {activity.response_outcome === 'positive' && 'Positive'}
                                {activity.response_outcome === 'negative' && 'Negative'}
                                {activity.response_outcome === 'neutral' && 'Neutral'}
                              </span>
                            </div>
                          )}

                          {/* Closed status */}
                          {activity.closed_status && (
                            <div className="mt-1">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  activity.closed_status === 'closed_won'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {activity.closed_status === 'closed_won' && 'Closed Won'}
                                {activity.closed_status === 'closed_lost' && 'Closed Lost'}
                                {activity.deal_value && ` - $${activity.deal_value.toLocaleString()}`}
                              </span>
                            </div>
                          )}

                          {/* Notes */}
                          {activity.notes && (
                            <p className="mt-2 text-sm text-gray-600">{activity.notes}</p>
                          )}

                          {/* Timestamp */}
                          <div className="mt-2 text-xs text-gray-500">
                            <div>
                              Contact: {new Date(activity.contact_time).toLocaleString()}
                            </div>
                            {activity.response_time && (
                              <div>
                                Response: {new Date(activity.response_time).toLocaleString()}
                              </div>
                            )}
                            <div className="mt-1">
                              by {(activity as any).user?.email || 'Unknown'}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                          title="Delete activity"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showLogModal && (
        <LogActivityModal
          isOpen={showLogModal}
          listId={listId}
          itemId={item.id}
          onClose={() => setShowLogModal(false)}
          onSuccess={handleActivityLogged}
        />
      )}
    </>
  )
}
