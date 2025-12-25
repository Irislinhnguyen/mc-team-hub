'use client'

/**
 * Pipeline Context - Simplified for React Query
 *
 * Context now only handles mutations (create, update, delete).
 * Data fetching moved to React Query hooks (usePipelines).
 *
 * Benefits:
 * - Automatic caching via React Query
 * - Cache persists across navigation
 * - Stale-while-revalidate pattern
 * - Optimistic updates
 */

import React, { createContext, useContext } from 'react'
import {
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
} from '@/lib/hooks/queries/usePipelineMutations'
import type { Pipeline, CreatePipelineInput } from '@/lib/types/pipeline'

interface PipelineContextValue {
  // Mutation operations (wrapped for backward compatibility)
  createPipeline: (input: CreatePipelineInput) => Promise<Pipeline>
  updatePipeline: (id: string, updates: Partial<Pipeline>) => Promise<Pipeline>
  deletePipeline: (id: string) => Promise<void>

  // Error state from mutations
  error: string | null
  clearError: () => void
}

const PipelineContext = createContext<PipelineContextValue | null>(null)

export function usePipeline() {
  const context = useContext(PipelineContext)
  if (!context) {
    throw new Error('usePipeline must be used within PipelineProvider')
  }
  return context
}

interface PipelineProviderProps {
  children: React.ReactNode
}

export function PipelineProvider({ children }: PipelineProviderProps) {
  const createMutation = useCreatePipeline()
  const updateMutation = useUpdatePipeline()
  const deleteMutation = useDeletePipeline()

  // Consolidated error state from all mutations
  const error =
    createMutation.error?.message ||
    updateMutation.error?.message ||
    deleteMutation.error?.message ||
    null

  const clearError = () => {
    createMutation.reset()
    updateMutation.reset()
    deleteMutation.reset()
  }

  // Wrap mutations to provide consistent API
  const createPipeline = async (
    input: CreatePipelineInput
  ): Promise<Pipeline> => {
    const result = await createMutation.mutateAsync(input)
    return result.data
  }

  const updatePipeline = async (
    id: string,
    updates: Partial<Pipeline>
  ): Promise<Pipeline> => {
    const result = await updateMutation.mutateAsync({ id, updates })
    return result.data
  }

  const deletePipeline = async (id: string): Promise<void> => {
    await deleteMutation.mutateAsync(id)
  }

  const value: PipelineContextValue = {
    createPipeline,
    updatePipeline,
    deletePipeline,
    error,
    clearError,
  }

  return (
    <PipelineContext.Provider value={value}>
      {children}
    </PipelineContext.Provider>
  )
}

// Export types for backwards compatibility
export type { PipelineContextValue }
