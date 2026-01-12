'use client'

/**
 * Quarterly Sheet Manager Component
 *
 * Displays table of quarterly sheets with sync controls
 */

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw, ExternalLink, Copy, Pause, Play, Trash2 } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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

interface QuarterlySheetManagerProps {
  sheets: QuarterlySheet[]
  onRefresh: () => void
}

export function QuarterlySheetManager({ sheets, onRefresh }: QuarterlySheetManagerProps) {
  const { toast } = useToast()
  const [syncingSheets, setSyncingSheets] = useState<Set<string>>(new Set())
  const [updatingSheets, setUpdatingSheets] = useState<Set<string>>(new Set())

  const handleManualSync = async (sheetId: string) => {
    setSyncingSheets((prev) => new Set(prev).add(sheetId))

    try {
      const response = await fetch(`/api/pipelines/quarterly-sheets/${sheetId}/sync`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Sync completed',
          description: `Created: ${data.result.created}, Updated: ${data.result.updated}, Deleted: ${data.result.deleted}`,
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
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
