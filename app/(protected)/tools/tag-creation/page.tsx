import { requireAuth } from '@/lib/auth/server'
import { TagCreationWorkflow } from '@/app/components/tools/tag-creation/TagCreationWorkflow'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'AI Tag Creation Assistant - Tools',
  description: 'Generate zone CSV with AI, extract zone IDs, and sync to Google Sheets',
}

export default async function TagCreationPage() {
  await requireAuth() // All authenticated users can access

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        {/* Back Link */}
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tools
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#1565C0' }}>
            AI Tag Creation Assistant
          </h1>
        </div>

        {/* Workflow */}
        <TagCreationWorkflow />
      </div>
    </div>
  )
}
