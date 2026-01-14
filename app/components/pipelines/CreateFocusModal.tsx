'use client'

/**
 * Create Focus Modal
 * Modal form for creating a new Focus of the Month
 */

import { useState } from 'react'
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
import type { CreateFocusRequest } from '@/lib/types/focus'
import { typography, spacing, colors, composedStyles } from '@/lib/design-tokens'

const TEAMS = [
  { id: 'WEB_GTI', name: 'Web GTI' },
  { id: 'WEB_GV', name: 'Web GV' },
  { id: 'APP', name: 'App' },
]

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

interface CreateFocusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateFocusModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateFocusModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const currentDate = new Date()
  const [formData, setFormData] = useState<CreateFocusRequest>({
    focus_month: currentDate.getMonth() + 1,
    focus_year: currentDate.getFullYear(),
    group_type: 'sales',
    team_id: null,
    title: '',
    description: '',
  })

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

      const response = await fetch('/api/focus-of-month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.status === 'ok') {
        // Success
        onOpenChange(false)
        onSuccess?.()
        // Reset form
        setFormData({
          focus_month: currentDate.getMonth() + 1,
          focus_year: currentDate.getFullYear(),
          group_type: 'sales',
          team_id: null,
          title: '',
          description: '',
        })
      } else {
        setError(data.message || 'Failed to create focus')
      }
    } catch (err) {
      console.error('Error creating focus:', err)
      setError('Failed to create focus')
    } finally {
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i - 1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: typography.sizes.sectionTitle }} className={composedStyles.sectionTitle}>
              Create New Focus
            </DialogTitle>
            <DialogDescription className={colors.text.secondary}>
              Create a new Focus of the Month to track pipeline suggestions and progress
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Month & Year */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="focus_month" className={colors.text.secondary}>
                  Month *
                </Label>
                <Select
                  value={formData.focus_month.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, focus_month: parseInt(value) })
                  }
                >
                  <SelectTrigger id="focus_month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, idx) => (
                      <SelectItem key={month} value={(idx + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="focus_year" className={colors.text.secondary}>
                  Year *
                </Label>
                <Select
                  value={formData.focus_year.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, focus_year: parseInt(value) })
                  }
                >
                  <SelectTrigger id="focus_year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Group Type */}
            <div className="space-y-2">
              <Label htmlFor="group_type" className={colors.text.secondary}>
                Group Type *
              </Label>
              <Select
                value={formData.group_type}
                onValueChange={(value: 'sales' | 'cs') =>
                  setFormData({ ...formData, group_type: value })
                }
              >
                <SelectTrigger id="group_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="group-sales" value="sales">Sales</SelectItem>
                  <SelectItem key="group-cs" value="cs">CS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Team */}
            <div className="space-y-2">
              <Label htmlFor="team_id" className={colors.text.secondary}>
                Team (Optional)
              </Label>
              <Select
                value={formData.team_id || 'all'}
                onValueChange={(value) =>
                  setFormData({ ...formData, team_id: value === 'all' ? null : value })
                }
              >
                <SelectTrigger id="team_id">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="team-all" value="all">All Teams</SelectItem>
                  {TEAMS.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className={colors.text.secondary}>
                Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g., Q1 2025 Growth Initiatives"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                minLength={3}
                maxLength={200}
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
                placeholder="Describe the focus objectives, target metrics, or any additional context..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                maxLength={1000}
                rows={4}
              />
              <p className={`text-xs ${colors.text.muted}`}>
                {formData.description?.length || 0}/1000 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

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
              {loading ? 'Creating...' : 'Create Focus'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
