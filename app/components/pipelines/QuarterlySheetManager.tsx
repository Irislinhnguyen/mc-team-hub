'use client'

/**
 * Quarterly Sheet Manager Component
 *
 * Displays table of quarterly sheets with sync controls
 */

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw, ExternalLink, Copy, Pause, Play, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { EditQuarterlySheetModal } from './EditQuarterlySheetModal'

interface QuarterlySheet {
  id: string
  year: number
  quarter: number
  group: 'sales' | 'cs'
  spreadsheet_id: string
  sheet_name: string
  sheet_url: string
  sync_status: 'active' | 'paused' | 'archived'
  last_sync_at: string | null
  last_sync_status: 'success' | 'failed' | 'partial' | null
  last_sync_error: string | null
  webhook_token: string | null
  pipeline_count?: number
}

interface SyncResult {
  success: boolean
  total: number
  created: number
  updated: number
  deleted: number
  errors: string[]
  duration_ms: number
}

interface QuarterlySheetManagerProps {
  sheets: QuarterlySheet[]
  onRefresh: () => void
}

export function QuarterlySheetManager({ sheets, onRefresh }: QuarterlySheetManagerProps) {
  const { toast } = useToast()
  const [syncingSheets, setSyncingSheets] = useState<Set<string>>(new Set())
  const [updatingSheets, setUpdatingSheets] = useState<Set<string>>(new Set())
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Edit modal state
  const [editingSheet, setEditingSheet] = useState<QuarterlySheet | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Delete confirmation state
  const [deletingSheet, setDeletingSheet] = useState<QuarterlySheet | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleManualSync = async (sheetId: string) => {
    setSyncingSheets((prev) => new Set(prev).add(sheetId))

    try {
      const response = await fetch(`/api/pipelines/quarterly-sheets/${sheetId}/sync`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        // Capture sync result for modal
        setSyncResult(data.result)
        setShowSuccessModal(true)

        // Also show toast for quick notification
        toast({
          title: '✅ Sync completed',
          description: `${data.result.created} created, ${data.result.updated} updated`,
        })

        onRefresh()
      } else {
        toast({
          title: 'Sync failed',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Sync failed',
        description: error.message || 'Network error',
        variant: 'destructive',
      })
    } finally {
      setSyncingSheets((prev) => {
        const next = new Set(prev)
        next.delete(sheetId)
        return next
      })
    }
  }

  const handleToggleStatus = async (sheetId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    setUpdatingSheets((prev) => new Set(prev).add(sheetId))

    try {
      const response = await fetch(`/api/pipelines/quarterly-sheets/${sheetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync_status: newStatus }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: `Sync ${newStatus === 'active' ? 'enabled' : 'paused'}`,
          description: data.message,
        })
        onRefresh()
      } else {
        toast({
          title: 'Update failed',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Network error',
        variant: 'destructive',
      })
    } finally {
      setUpdatingSheets((prev) => {
        const next = new Set(prev)
        next.delete(sheetId)
        return next
      })
    }
  }

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    toast({
      title: 'Token copied',
      description: 'Webhook token copied to clipboard',
    })
  }

  const handleEdit = (sheet: QuarterlySheet) => {
    setEditingSheet(sheet)
    setShowEditModal(true)
  }

  const handleDelete = (sheet: QuarterlySheet) => {
    setDeletingSheet(sheet)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deletingSheet) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/pipelines/quarterly-sheets/${deletingSheet.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: '✅ Sheet Deleted',
          description: 'Quarterly sheet and all associated pipelines have been deleted',
        })

        setShowDeleteDialog(false)
        setDeletingSheet(null)
        onRefresh()
      } else {
        toast({
          title: 'Delete failed',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message || 'Network error',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getSyncStatusBadge = (sheet: QuarterlySheet) => {
    if (sheet.sync_status === 'paused') {
      return <Badge variant="outline">Paused</Badge>
    }
    if (sheet.sync_status === 'archived') {
      return <Badge variant="secondary">Archived</Badge>
    }

    if (!sheet.last_sync_status) {
      return <Badge variant="outline">Not synced</Badge>
    }

    switch (sheet.last_sync_status) {
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'partial':
        return <Badge className="bg-yellow-500">Partial</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getLastSyncText = (sheet: QuarterlySheet) => {
    if (!sheet.last_sync_at) return 'Never'
    return formatDistanceToNow(new Date(sheet.last_sync_at), { addSuffix: true })
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quarter</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Sheet Name</TableHead>
            <TableHead>Pipelines</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Sync</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sheets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No quarterly sheets registered. Add one to get started.
              </TableCell>
            </TableRow>
          ) : (
            sheets.map((sheet) => (
              <TableRow key={sheet.id}>
                <TableCell className="font-medium">
                  Q{sheet.quarter} {sheet.year}
                </TableCell>
                <TableCell>
                  <Badge variant={sheet.group === 'sales' ? 'default' : 'secondary'}>
                    {sheet.group.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{sheet.sheet_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => window.open(sheet.sheet_url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{sheet.pipeline_count || 0}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {getSyncStatusBadge(sheet)}
                    {sheet.last_sync_error && (
                      <span className="text-xs text-destructive truncate max-w-[200px]">
                        {sheet.last_sync_error}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {getLastSyncText(sheet)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Sync button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleManualSync(sheet.id)}
                      disabled={
                        syncingSheets.has(sheet.id) ||
                        sheet.sync_status !== 'active'
                      }
                    >
                      <RefreshCw
                        className={cn(
                          'h-4 w-4',
                          syncingSheets.has(sheet.id) && 'animate-spin'
                        )}
                      />
                      {syncingSheets.has(sheet.id) && (
                        <span className="ml-2 text-xs">Syncing...</span>
                      )}
                    </Button>

                    {/* Pause/Resume button */}
                    {sheet.sync_status !== 'archived' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(sheet.id, sheet.sync_status)}
                        disabled={updatingSheets.has(sheet.id)}
                      >
                        {sheet.sync_status === 'active' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {/* Copy webhook token */}
                    {sheet.webhook_token && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToken(sheet.webhook_token!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Edit button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(sheet)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(sheet)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Sync Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              Sync Completed
            </DialogTitle>
          </DialogHeader>

          {syncResult && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* Created */}
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-600">
                    {syncResult.created}
                  </div>
                  <div className="text-sm text-green-700 font-medium mt-1">
                    Created
                  </div>
                </div>

                {/* Updated */}
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600">
                    {syncResult.updated}
                  </div>
                  <div className="text-sm text-blue-700 font-medium mt-1">
                    Updated
                  </div>
                </div>

                {/* Total */}
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-3xl font-bold text-gray-600">
                    {syncResult.total}
                  </div>
                  <div className="text-sm text-gray-700 font-medium mt-1">
                    Total
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center justify-center text-sm text-gray-600 bg-gray-50 py-2 rounded-lg">
                ⏱️ Completed in {((syncResult.duration_ms || 0) / 1000).toFixed(2)}s
              </div>

              {/* Errors */}
              {syncResult.errors && syncResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{syncResult.errors.length} Error(s)</span>
                  </div>
                  <div className="text-sm text-red-700 max-h-40 overflow-y-auto space-y-1">
                    {syncResult.errors.map((error, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-red-400">•</span>
                        <span className="flex-1">{error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {syncResult.success && syncResult.errors.length === 0 && (
                <div className="text-center py-3">
                  <div className="inline-flex items-center gap-2 text-green-700 font-medium bg-green-50 px-4 py-2 rounded-lg">
                    <span className="text-lg">✓</span>
                    <span>All pipelines synced successfully!</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowSuccessModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Quarterly Sheet Modal */}
      <EditQuarterlySheetModal
        sheet={editingSheet}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSheetUpdated={onRefresh}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quarterly Sheet?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>Q{deletingSheet?.quarter} {deletingSheet?.year} ({deletingSheet?.group?.toUpperCase()})</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                ⚠️ <strong>Warning:</strong> This will delete:
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
                <li>The quarterly sheet configuration</li>
                <li>All {deletingSheet?.pipeline_count || 0} associated pipelines</li>
              </ul>
              <p className="text-sm text-red-800 mt-3">
                This action <strong>cannot be undone</strong>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Sheet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
