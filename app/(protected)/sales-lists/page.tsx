'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSalesList } from '@/app/contexts/SalesListContext'
import { SalesListWithStats } from '@/lib/types/salesLists'
import { Plus, Search, ListChecks, TrendingUp, Users, Calendar } from 'lucide-react'
import { CreateListModal } from '@/app/components/sales-lists/CreateListModal'
// import { formatDate } from '@/lib/utils/formatters'

export default function SalesListsPage() {
  const router = useRouter()
  const { lists, isLoading, fetchLists } = useSalesList()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filteredLists, setFilteredLists] = useState<SalesListWithStats[]>([])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      setFilteredLists(
        lists.filter(
          list =>
            list.name.toLowerCase().includes(query) ||
            (list.description && list.description.toLowerCase().includes(query))
        )
      )
    } else {
      setFilteredLists(lists)
    }
  }, [lists, searchQuery])

  const handleListClick = (listId: string) => {
    router.push(`/sales-lists/${listId}`)
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Sales Lists</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track outreach campaigns and manage customer interactions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={20} />
            New List
          </button>
        </div>

        {/* Search */}
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          </div>
        )}

        {!isLoading && filteredLists.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ListChecks className="h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No lists yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Get started by creating your first sales list
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={20} />
              Create List
            </button>
          </div>
        )}

        {!isLoading && filteredLists.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No results found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Try adjusting your search query
            </p>
          </div>
        )}

        {!isLoading && filteredLists.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLists.map((list) => (
              <div
                key={list.id}
                onClick={() => handleListClick(list.id)}
                className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-500 hover:shadow-md"
              >
                {/* Color indicator */}
                <div
                  className="mb-4 h-1 w-12 rounded-full"
                  style={{ backgroundColor: list.color }}
                />

                {/* List name and description */}
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                  {list.name}
                </h3>
                {list.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{list.description}</p>
                )}

                {/* Stats */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {list.total_items}
                      </div>
                      <div className="text-xs text-gray-500">Items</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {list.total_contacts}
                      </div>
                      <div className="text-xs text-gray-500">Contacts</div>
                    </div>
                  </div>
                </div>

                {/* Outcomes */}
                <div className="mt-4 flex items-center gap-4 text-xs">
                  {list.closed_won_count > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <span className="font-medium">{list.closed_won_count}</span> Won
                    </span>
                  )}
                  {list.positive_count > 0 && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <span className="font-medium">{list.positive_count}</span> Positive
                    </span>
                  )}
                  {list.awaiting_count > 0 && (
                    <span className="flex items-center gap-1 text-gray-600">
                      <span className="font-medium">{list.awaiting_count}</span> Awaiting
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {/* {formatDate(list.updated_at)} */}
                    {list.updated_at}
                  </span>
                  {list.total_retargets > 0 && (
                    <span className="text-orange-600">
                      {list.total_retargets} retarget{list.total_retargets !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create List Modal */}
      {showCreateModal && (
        <CreateListModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
