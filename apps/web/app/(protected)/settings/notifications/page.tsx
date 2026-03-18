/**
 * Notification Preferences Page
 * Route: /settings/notifications
 * Allows users to configure email and in-app notification settings per category
 */

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, RefreshCw } from 'lucide-react'

type NotificationCategory = 'challenge' | 'bible' | 'system' | 'team'

interface NotificationPreferences {
  email: Record<NotificationCategory, boolean>
  inapp: Record<NotificationCategory, boolean>
}

interface CategoryInfo {
  id: NotificationCategory
  name: string
  description: string
  icon: string
}

const CATEGORIES: CategoryInfo[] = [
  {
    id: 'challenge',
    name: 'Challenges',
    description: 'Knowledge championship updates, grading, and results',
    icon: '🏆'
  },
  {
    id: 'bible',
    name: 'Bible',
    description: 'Learning path updates, new articles, and completion',
    icon: '📚'
  },
  {
    id: 'system',
    name: 'System',
    description: 'Platform updates, maintenance, and announcements',
    icon: '⚙️'
  },
  {
    id: 'team',
    name: 'Team',
    description: 'Team assignments, approvals, and collaboration',
    icon: '👥'
  }
]

/**
 * Fetch preferences hook
 */
function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async (): Promise<NotificationPreferences> => {
      const res = await fetch('/api/notifications/preferences')
      if (!res.ok) throw new Error('Failed to fetch preferences')
      const data = await res.json()
      return data.preferences
    }
  })
}

/**
 * Update preferences mutation
 */
function useUpdatePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (preferences: NotificationPreferences) => {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })
      if (!res.ok) throw new Error('Failed to update preferences')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      toast.success('Notification preferences saved')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save preferences')
    }
  })
}

export default function NotificationPreferencesPage() {
  const { data: preferences, isLoading } = useNotificationPreferences()
  const updatePreferences = useUpdatePreferences()
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize local prefs when data loads
  if (preferences && !localPrefs) {
    setLocalPrefs(preferences)
  }

  /**
   * Handle toggle change
   */
  const handleToggle = (
    category: NotificationCategory,
    channel: 'email' | 'inapp',
    value: boolean
  ) => {
    if (!localPrefs) return

    setLocalPrefs({
      ...localPrefs,
      [channel]: {
        ...localPrefs[channel],
        [category]: value
      }
    })
  }

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!localPrefs) return

    setIsSaving(true)
    try {
      await updatePreferences.mutateAsync(localPrefs)
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Handle reset to defaults
   */
  const handleReset = () => {
    if (!preferences) return

    // Reset to role-based defaults (all on for admin/manager, mixed for leader/member)
    // This resets to what the server would return for a new user
    setLocalPrefs({
      email: { challenge: true, bible: true, system: true, team: true },
      inapp: { challenge: true, bible: true, system: true, team: true }
    })
    toast.info('Preferences reset to defaults. Click Save to apply.')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-8 py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (!preferences || !localPrefs) {
    return (
      <div className="container mx-auto px-8 py-6">
        <div className="text-center text-gray-500">
          Failed to load notification preferences
        </div>
      </div>
    )
  }

  const hasChanges = JSON.stringify(localPrefs) !== JSON.stringify(preferences)

  return (
    <div className="container mx-auto px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="text-gray-600 mt-2">
          Choose which notifications you receive via email and in-app
        </p>
      </div>

      <div className="space-y-6 max-w-4xl">
        {CATEGORIES.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="text-2xl">{category.icon}</span>
                {category.name}
              </CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Email Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email Notifications</div>
                    <div className="text-sm text-gray-500">
                      Receive {category.name.toLowerCase()} notifications via email
                    </div>
                  </div>
                  <Switch
                    checked={localPrefs.email[category.id]}
                    onCheckedChange={(checked) => handleToggle(category.id, 'email', checked)}
                  />
                </div>

                {/* In-App Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">In-App Notifications</div>
                    <div className="text-sm text-gray-500">
                      Show {category.name.toLowerCase()} notifications in the app
                    </div>
                  </div>
                  <Switch
                    checked={localPrefs.inapp[category.id]}
                    onCheckedChange={(checked) => handleToggle(category.id, 'inapp', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>

        {hasChanges && (
          <span className="text-sm text-gray-500">
            You have unsaved changes
          </span>
        )}
      </div>
    </div>
  )
}
