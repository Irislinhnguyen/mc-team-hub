'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSalesList } from '@/app/contexts/SalesListContext'
import { SalesListItemSummary } from '@/lib/types/salesLists'
import { ArrowLeft, Plus, MoreVertical, Trash2, Edit, Share2, TrendingUp } from 'lucide-react'
import { AddItemManualModal } from '@/components/sales-lists/AddItemManualModal'
import { EditListModal } from '@/components/sales-lists/EditListModal'
import { DeleteListDialog } from '@/components/sales-lists/DeleteListDialog'
import { ItemDetailDrawer } from '@/components/sales-lists/ItemDetailDrawer'
import { getStatusConfig } from '@/components/sales-lists/statusUtils'
import { toast } from 'sonner'
// import { formatDate } from '@/lib/utils/formatters'

export default function ListDetailPage() {
  const router = useRouter()
  const params = useParams()
  const listId = params.id as string

  const { lists, fetchListItems } = useSalesList()
  const [list, setList] = useState(lists.find(l => l.id === listId))
  const [items, setItems] = useState<SalesListItemSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<SalesListItemSummary | null>(null)
  const [showItemDrawer, setShowItemDrawer] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const foundList = lists.find(l => l.id === listId)
    setList(foundList)
  }, [lists, listId])

  useEffect(() => {
    loadItems()
  }, [listId])

  const loadItems = async () => {
    setIsLoading(true)
    try {
      const fetchedItems = await fetchListItems(listId)
      setItems(fetchedItems)
    } catch (error) {
      console.error('Error loading items:', error)
      toast.error('Failed to load items')
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemClick = (item: SalesListItemSummary) => {
    setSelectedItem(item)
    setShowItemDrawer(true)
  }

  if (!list) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">List not found</h2>
          <button
            onClick={() => router.push('/sales-lists')}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            Back to Lists
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/sales-lists')}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-1 rounded-full"
                style={{ backgroundColor: list.color }}
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
                {list.description && (
                  <p className="mt-1 text-sm text-gray-500">{list.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Items
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <MoreVertical size={20} className="text-gray-600" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowEditModal(true)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit size={16} />
                    Edit List
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      // TODO: Show share modal
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Share2 size={16} />
                    Share List
                  </button>
                  <div className="my-1 border-t border-gray-200" />
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowDeleteDialog(true)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    Delete List
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-2xl font-bold text-gray-900">{list.total_items}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-2xl font-bold text-gray-900">{list.total_contacts}</div>
            <div className="text-sm text-gray-600">Total Contacts</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-2xl font-bold text-green-600">{list.closed_won_count}</div>
            <div className="text-sm text-gray-600">Closed Won</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-2xl font-bold text-orange-600">{list.total_retargets}</div>
            <div className="text-sm text-gray-600">Retargets</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-gray-400">
              <TrendingUp size={64} />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No items yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Add items to start tracking your sales activities
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Items
            </button>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Publisher / App
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Contacts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => {
                  const statusConfig = getStatusConfig(item.current_status)
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {item.item_label || item.item_value}
                        </div>
                        <div className="text-sm text-gray-500">{item.item_value}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
                            >
                              {statusConfig.label}
                            </span>
                          </div>
                          {item.latest_contact_type === 'retarget' && (
                            <div className="text-xs text-gray-500">Retarget</div>
                          )}
                          {item.latest_contact_type === 'follow_up' && (
                            <div className="text-xs text-gray-500">Follow-up</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {item.total_contacts} contact{item.total_contacts !== 1 ? 's' : ''}
                        </div>
                        {item.retarget_count > 0 && (
                          <div
                            className={`text-xs ${
                              item.retarget_count >= 3 ? 'font-medium text-orange-600' : 'text-gray-500'
                            }`}
                          >
                            {item.retarget_count} retarget{item.retarget_count !== 1 ? 's' : ''}
                            {item.retarget_count >= 3 && ' - Warning'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.last_contact_at && (
                          <>
                            <div className="text-sm text-gray-900">
                              {/* {formatDate(item.last_contact_at)} */}
                              {item.last_contact_at}
                            </div>
                            {item.last_activity_by && (
                              <div className="text-xs text-gray-500">by {item.last_activity_by}</div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleItemClick(item)
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddItemManualModal
          isOpen={showAddModal}
          listId={listId}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadItems}
        />
      )}

      {showEditModal && (
        <EditListModal
          isOpen={showEditModal}
          list={list}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showDeleteDialog && (
        <DeleteListDialog
          isOpen={showDeleteDialog}
          list={list}
          onClose={() => setShowDeleteDialog(false)}
          onSuccess={() => router.push('/sales-lists')}
        />
      )}

      {showItemDrawer && selectedItem && (
        <ItemDetailDrawer
          isOpen={showItemDrawer}
          listId={listId}
          item={selectedItem}
          onClose={() => {
            setShowItemDrawer(false)
            setSelectedItem(null)
          }}
          onActivityLogged={loadItems}
        />
      )}
    </div>
  )
}
