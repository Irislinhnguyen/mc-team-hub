import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { progressNotes, pipelineStatus, publisher, actionDate } = await request.json()

    if (!progressNotes) {
      return NextResponse.json(
        { error: 'Progress notes are required' },
        { status: 400 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective
      max_tokens: 100,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: 'You are a professional assistant that summarizes pipeline status updates concisely. The "Action Progress" field contains a summary of the current pipeline status. Keep summaries under 80 characters.'
        },
        {
          role: 'user',
          content: `Summarize this pipeline status in ONE concise sentence (max 80 chars):

Pipeline: ${publisher}
Current Status: ${pipelineStatus}
Action Date: ${actionDate || 'Not set'}
Action Progress (current status summary): ${progressNotes}

Summary (concise, 1 sentence):`,
        },
      ],
    })

    const summary = completion.choices[0]?.message?.content?.trim() || progressNotes

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('AI summarization error:', error)
    return NextResponse.json(
      { error: 'Failed to summarize progress' },
      { status: 500 }
    )
  }
}
