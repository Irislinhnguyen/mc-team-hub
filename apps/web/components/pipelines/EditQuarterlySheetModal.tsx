'use client'

/**
 * Edit Quarterly Sheet Modal
 *
 * Modal for editing an existing quarterly sheet
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

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

interface EditQuarterlySheetModalProps {
  sheet: QuarterlySheet | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSheetUpdated: () => void
}

export function EditQuarterlySheetModal({
  sheet,
  open,
  onOpenChange,
  onSheetUpdated,
}: EditQuarterlySheetModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [sheetUrl, setSheetUrl] = useState('')
  const [sheetName, setSheetName] = useState('')
  const [syncStatus, setSyncStatus] = useState<'active' | 'paused' | 'archived'>('active')

  // Reset form when sheet changes
  useEffect(() => {
    if (sheet) {
      setSheetUrl(sheet.sheet_url || '')
      setSheetName(sheet.sheet_name || '')
      setSyncStatus(sheet.sync_status || 'active')
    }
  }, [sheet])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sheet) return

    setLoading(true)

    try {
      const response = await fetch(`/api/pipelines/quarterly-sheets/${sheet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_status: syncStatus,
          // Note: Currently API only supports updating sync_status
          // To update URL and name, we'd need to extend the API
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: '✅ Sheet Updated',
          description: data.message,
        })

        onOpenChange(false)
        onSheetUpdated()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update sheet',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      console.error('Failed to update sheet:', error)
      toast({
        title: 'Error',
        description: error.message || 'Network error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!sheet) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Quarterly Sheet</DialogTitle>
          <DialogDescription>
            Q{sheet.quarter} {sheet.year} ({sheet.group.toUpperCase()})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Read-only info */}
            <div className="grid gap-2">
              <Label>Year</Label>
              <Input value={sheet.year} disabled className="bg-muted" />
            </div>

            <div className="grid gap-2">
              <Label>Quarter</Label>
              <Input value={`Q${sheet.quarter}`} disabled className="bg-muted" />
            </div>

            <div className="grid gap-2">
              <Label>Group</Label>
              <Input value={sheet.group.toUpperCase()} disabled className="bg-muted" />
            </div>

            {/* Sheet URL (read-only for now - API doesn't support update) */}
            <div className="grid gap-2">
              <Label htmlFor="sheetUrl">Google Sheet URL</Label>
              <Input
                id="sheetUrl"
                type="url"
                value={sheetUrl}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Cannot modify URL after creation
              </p>
            </div>

            {/* Sheet Name (read-only for now) */}
            <div className="grid gap-2">
              <Label htmlFor="sheetName">Sheet Name</Label>
              <Input
                id="sheetName"
                type="text"
                value={sheetName}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Cannot modify name after creation
              </p>
            </div>

            {/* Sync Status */}
            <div className="grid gap-2">
              <Label htmlFor="syncStatus">Sync Status</Label>
              <Select value={syncStatus} onValueChange={(v: any) => setSyncStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="status-active" value="active">Active</SelectItem>
                  <SelectItem key="status-paused" value="paused">Paused</SelectItem>
                  <SelectItem key="status-archived" value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Sheet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
