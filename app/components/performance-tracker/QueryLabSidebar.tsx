'use client'

/**
 * Query Lab Sidebar - Session List
 *
 * Brand-aligned sidebar with clean design:
 * - Primary Blue: #1565C0
 * - Light Accent: #BBDEFB
 * - Hover: #0D47A1
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/src/components/ui/button'
import { ScrollArea } from '@/src/components/ui/scroll-area'
import { useAuth } from '@/app/contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu'
import {
  Plus,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Archive,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ArrowLeft,
  Sparkles,
  LogOut,
  Settings,
  LayoutDashboard
} from 'lucide-react'

interface Session {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
  last_message_at: string
  message_count: number
}

interface GroupedSessions {
  today: Session[]
  yesterday: Session[]
  lastWeek: Session[]
  older: Session[]
}

interface QueryLabSidebarProps {
  currentSessionId: string | null
  sessions: Session[]
  grouped: GroupedSessions
  onUpdateTitle: (id: string, newTitle: string) => void
  onSelectSession: (sessionId: string) => void
  onNewChat: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function QueryLabSidebar({
  currentSessionId,
  sessions,
  grouped,
  onUpdateTitle,
  onSelectSession,
  onNewChat,
  collapsed = false,
  onToggleCollapse
}: QueryLabSidebarProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // Rename session
  const handleRename = async (sessionId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }

    try {
      const res = await fetch(`/api/query-lab/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() })
      })

      if (res.ok) {
        onUpdateTitle(sessionId, editTitle.trim())
      }
    } catch (error) {
      console.error('Failed to rename session:', error)
    } finally {
      setEditingId(null)
    }
  }

  // Delete session
  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this conversation?')) return

    try {
      const res = await fetch(`/api/query-lab/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        // Parent will handle refresh on next new chat
        if (currentSessionId === sessionId) {
          onNewChat()
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  // Archive session
  const handleArchive = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/query-lab/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      })

      if (res.ok) {
        // Parent will handle refresh
        if (currentSessionId === sessionId) {
          onNewChat()
        }
      }
    } catch (error) {
      console.error('Failed to archive session:', error)
    }
  }

  // Render session item
  const renderSessionItem = (session: Session) => {
    const isActive = currentSessionId === session.id
    const isEditing = editingId === session.id

    return (
      <div
        key={session.id}
        className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
          isActive
            ? 'bg-[#1565C0] text-white shadow-sm'
            : 'text-gray-700 hover:bg-[#BBDEFB]/40'
        }`}
        onClick={() => !isEditing && onSelectSession(session.id)}
      >
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => handleRename(session.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename(session.id)
              if (e.key === 'Escape') setEditingId(null)
            }}
            className="flex-1 bg-white border border-[#1565C0]/30 rounded px-2 py-0.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#1565C0]"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-sm truncate font-medium">{session.title}</span>
        )}

        {!isEditing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`opacity-0 group-hover:opacity-100 h-6 w-6 p-0 ${isActive ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-200'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setEditTitle(session.title)
                  setEditingId(session.id)
                }}
                className="text-gray-700"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleArchive(session.id)
                }}
                className="text-gray-700"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(session.id)
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    )
  }

  // Render session group
  const renderGroup = (title: string, sessions: Session[]) => {
    if (sessions.length === 0) return null

    return (
      <div className="mb-4">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
          {title}
        </div>
        <div className="space-y-1">
          {sessions.map(renderSessionItem)}
        </div>
      </div>
    )
  }

  if (collapsed) {
    return (
      <div className="w-14 h-full bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 text-gray-600 hover:text-[#1565C0] hover:bg-[#BBDEFB]/30"
          onClick={() => router.push('/performance-tracker/business-health')}
          title="Back to Performance Tracker"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-gray-600 hover:text-[#1565C0] hover:bg-[#BBDEFB]/30"
          onClick={onToggleCollapse}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewChat}
          title="New Chat"
          className="text-[#1565C0] hover:bg-[#BBDEFB]/30"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-72 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/performance-tracker/business-health')}
            className="text-gray-500 hover:text-[#1565C0] hover:bg-[#BBDEFB]/30 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="text-gray-400 hover:text-[#1565C0] hover:bg-[#BBDEFB]/30"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#1565C0] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-[#1565C0]">Query Lab</span>
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[#BBDEFB] text-[#1565C0] font-medium">Beta</span>
          </div>
        </div>
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1 px-2 pb-4">
        {sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="h-12 w-12 rounded-full bg-[#BBDEFB]/50 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-6 w-6 text-[#1565C0]" />
            </div>
            <p className="text-sm text-gray-500 font-medium">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">Start a new chat to begin!</p>
          </div>
        ) : (
          <>
            {renderGroup('Today', grouped.today)}
            {renderGroup('Yesterday', grouped.yesterday)}
            {renderGroup('Previous 7 Days', grouped.lastWeek)}
            {renderGroup('Older', grouped.older)}
          </>
        )}
      </ScrollArea>

      {/* User Info - Bottom with Dropdown */}
      {user && (
        <div className="p-3 border-t border-gray-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-50/80 hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-[#1565C0] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {user.name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                </div>
                <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48">
              <DropdownMenuItem
                onClick={() => router.push('/')}
                className="cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Back to Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

// Export a refresh function for external use
export function useSessionRefresh() {
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey(k => k + 1)
  return { refreshKey, refresh }
}
