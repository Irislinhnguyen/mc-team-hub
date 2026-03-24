import { requireAuth } from '@query-stream-ai/auth/server'
import { TagCreationWorkflowV2 } from '@/components/tools/tag-creation-v2/TagCreationWorkflowV2'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'AI Tag Creation Assistant V2 - CSV Upload',
  description: 'Generate zone CSV with AI, upload CSV from ad system, and sync to Google Sheets',
}

export default async function TagCreationV2Page() {
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
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold" style={{ color: '#1565C0' }}>
              AI Tag Creation Assistant V2
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              CSV Upload
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Upload zoneInfo.csv from ad system (no screenshot required)
          </p>
        </div>

        {/* Workflow */}
        <TagCreationWorkflowV2 />
      </div>
    </div>
  )
}
