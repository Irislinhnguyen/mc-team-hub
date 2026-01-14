'use client'

/**
 * Edit Focus Modal
 * Modal form for editing an existing Focus of the Month
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import type { Focus } from '@/lib/types/focus'
import { typography, spacing, colors, composedStyles } from '@/lib/design-tokens'

interface EditFocusModalProps {
  focus: Focus
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditFocusModal({
  focus,
  open,
  onOpenChange,
  onSuccess,
}: EditFocusModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state - initialize with current focus data
  const [formData, setFormData] = useState({
    title: focus.title,
    description: focus.description || '',
    status: focus.status,
  })

  // Update form when focus changes
  useEffect(() => {
    setFormData({
      title: focus.title,
      description: focus.description || '',
      status: focus.status,
    })
  }, [focus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate title
      if (formData.title.length < 3) {
        setError('Title must be at least 3 characters')
        setLoading(false)
        return
      }

      if (formData.title.length > 200) {
        setError('Title must be less than 200 characters')
        setLoading(false)
        return
      }

      // Validate description
      if (formData.description && formData.description.length > 1000) {
        setError('Description must be less than 1000 characters')
        setLoading(false)
        return
      }

      // Call API
      const response = await fetch(`/api/focus-of-month/${focus.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
        }),
      })

      const data = await response.json()

      if (data.status === 'ok') {
        // Success
        onOpenChange(false)
        onSuccess?.()
      } else {
        setError(data.message || 'Failed to update focus')
      }
    } catch (err) {
      console.error('Error updating focus:', err)
      setError('Failed to update focus. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle style={{ fontSize: typography.sizes.sectionTitle }} className={composedStyles.sectionTitle}>
            Edit Focus
          </DialogTitle>
          <DialogDescription className={colors.text.secondary}>
            Update the focus details and status
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className={colors.text.secondary}>
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Enter focus title..."
              maxLength={200}
              disabled={loading}
            />
            <p className={`text-xs ${colors.text.muted}`}>
              {formData.title.length}/200 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className={colors.text.secondary}>
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the focus objectives, target metrics, or any additional context..."
              maxLength={1000}
              rows={4}
              disabled={loading}
            />
            <p className={`text-xs ${colors.text.muted}`}>
              {formData.description?.length || 0}/1000 characters
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className={colors.text.secondary}>
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value as any })
              }
              disabled={loading}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="status-draft" value="draft">Draft</SelectItem>
                <SelectItem key="status-published" value="published">Published</SelectItem>
                <SelectItem key="status-archived" value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <p className={`text-xs ${colors.text.muted}`}>
              {formData.status === 'draft' && 'Draft focuses are not visible to team members'}
              {formData.status === 'published' &&
                'Published focuses are visible and active'}
              {formData.status === 'archived' && 'Archived focuses are read-only'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
