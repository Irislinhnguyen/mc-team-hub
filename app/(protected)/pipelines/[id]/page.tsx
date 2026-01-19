'use client'

export const dynamic = 'force-dynamic'

/**
 * Pipeline Detail Page Redirect
 * Redirects old /pipelines/[id] URLs to new group-based architecture
 * Can be removed after 30 days of deployment
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function PipelineRedirect() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      try {
        const supabase = getSupabaseClient()

        // Fetch pipeline to get its group
        const { data: pipeline, error } = await supabase
          .from('pipelines')
          .select('group')
          .eq('id', params.id)
          .single()

        if (error) {
          console.error('Error fetching pipeline:', error)
          // Fallback to sales group if error
          router.replace(`/pipelines?group=sales&pipeline=${params.id}`)
          return
        }

        if (pipeline) {
          // Redirect to new URL with group and pipeline ID
          const group = pipeline.group || 'sales' // Default to sales if no group
          router.replace(`/pipelines?group=${group}&pipeline=${params.id}`)
        } else {
          // Pipeline not found, redirect to main pipelines page
          router.replace('/pipelines')
        }
      } catch (error) {
        console.error('Redirect error:', error)
        router.replace('/pipelines')
      }
    }

    redirect()
  }, [params.id, router])

  return (
    <div className="container mx-auto py-8">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
