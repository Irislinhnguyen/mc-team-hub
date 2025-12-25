import type { Pipeline } from '@/lib/types/pipeline'

export async function formatPipelineReport(pipeline: Pipeline): Promise<string[]> {
  // Line 1: Status, Q Gross, Publisher, Product, POC, Date
  const line1 = `-${pipeline.status}, ${formatQGross(pipeline.q_gross)}, ${pipeline.publisher}, ${pipeline.product || 'N/A'} (${pipeline.poc}, ${formatDate(pipeline.starting_date)})`

  // Line 2: Status description (AI summarized from action_detail + action_progress)
  const statusSummary = await summarizeProgress(pipeline)
  const line2 = `- Status: ${statusSummary}`

  // Line 3: Action Plan
  const line3 = `- Action Plan: ${pipeline.next_action || 'No action planned'}`

  return [line1, line2, line3, ''] // Empty line between pipelines
}

export async function generateReport(pipelines: Pipeline[]): Promise<string> {
  // Generate full report text from multiple pipelines with AI summarization
  const formatted = await Promise.all(
    pipelines.map(p => formatPipelineReport(p))
  )
  return formatted.map(lines => lines.join('\n')).join('\n')
}

async function summarizeProgress(pipeline: Pipeline): Promise<string> {
  // Combine action_detail and action_progress
  const progressNotes = [
    pipeline.action_detail,
    pipeline.action_progress
  ].filter(Boolean).join('. ')

  if (!progressNotes) {
    return 'No status update'
  }

  // If notes are short enough, return as-is (< 100 chars)
  if (progressNotes.length < 100) {
    return progressNotes
  }

  // Call AI to summarize
  try {
    const response = await fetch('/api/pipelines/summarize-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progressNotes,
        pipelineStatus: pipeline.status,
        publisher: pipeline.publisher
      })
    })

    if (!response.ok) {
      return progressNotes // Fallback to original if AI fails
    }

    const data = await response.json()
    return data.summary || progressNotes
  } catch (error) {
    console.error('Failed to summarize progress:', error)
    return progressNotes // Fallback to original
  }
}

function formatQGross(value: number | null): string {
  if (!value) return '0$/Q'
  return `${Math.round(value)}$/Q`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
