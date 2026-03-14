/**
 * React Query mutation hooks for pipeline CRUD operations
 *
 * Features:
 * - Automatic cache invalidation after mutations
 * - Optimistic updates (optional)
 * - Error handling with retries
 * - Loading states
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/config/queryClient'
import type { Pipeline, CreatePipelineInput } from '@/lib/types/pipeline'

export function useCreatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePipelineInput) => {
      const response = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create pipeline')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate all pipeline lists to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.lists()
      })
    },
  })
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pipeline> }) => {
      const response = await fetch(`/api/pipelines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update pipeline')
      }

      return response.json()
    },
    onSuccess: async (_, variables) => {
      // Invalidate pipeline lists cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.lists()
      })
      // Invalidate activities cache for this specific pipeline
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.activities(variables.id)
      })
      // Force immediate refetch instead of waiting
      await queryClient.refetchQueries({
        queryKey: queryKeys.pipelines.lists()
      })
    },
  })
}

export function useDeletePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/pipelines/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete pipeline')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate all pipeline lists to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.lists()
      })
    },
  })
}
