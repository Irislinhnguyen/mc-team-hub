/**
 * Question Upload API - Upload questions via CSV/XML
 * Endpoint: POST (upload file and import questions)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseQuestionsCSV, parseQuestionsXML } from '@/lib/parsers/questionParsers'
import type { ParsedQuestionFile } from '@/lib/types/challenge'

// =====================================================
// POST - Upload and parse questions file
// =====================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin/Manager can upload questions
    requireAdminOrManager(user)

    const challengeId = params.id
    const supabase = createAdminClient()

    // Check if challenge exists and is in draft status
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, status')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.status !== 'draft') {
      return NextResponse.json({
        error: 'Can only add questions to draft challenges',
      }, { status: 400 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const format = formData.get('format') as 'csv' | 'xml' | 'auto'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file content
    const text = await file.text()

    // Detect format if auto
    let detectedFormat: 'csv' | 'xml' = format
    if (format === 'auto') {
      if (text.trim().startsWith('<?xml') || text.trim().startsWith('<quiz')) {
        detectedFormat = 'xml'
      } else {
        detectedFormat = 'csv'
      }
    }

    // Parse file
    let parsed: ParsedQuestionFile
    try {
      if (detectedFormat === 'xml') {
        parsed = await parseQuestionsXML(text)
      } else {
        parsed = await parseQuestionsCSV(text)
      }
    } catch (error: any) {
      return NextResponse.json({
        error: 'Failed to parse file',
        details: error.message,
      }, { status: 400 })
    }

    // Return errors if any
    if (parsed.errors.length > 0) {
      return NextResponse.json({
        error: 'Validation errors',
        errors: parsed.errors,
        questions_count: parsed.questions.length,
      }, { status: 400 })
    }

    if (parsed.questions.length === 0) {
      return NextResponse.json({
        error: 'No valid questions found in file',
      }, { status: 400 })
    }

    // Get next display order
    const { data: lastQuestion } = await supabase
      .from('challenge_questions')
      .select('display_order')
      .eq('challenge_id', challengeId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    let startOrder = lastQuestion ? lastQuestion.display_order + 1 : 0

    // Prepare questions for insertion
    const questionsToInsert = parsed.questions.map((q, index) => {
      // Prepare correct_answer based on question type
      let correctAnswer: any = null
      const options = q.options as any

      if (q.type === 'cloze' && options.gaps) {
        correctAnswer = {
          gaps: options.gaps.map((g: any) => ({
            id: g.id,
            correct_index: g.correct_index,
          })),
        }
      } else if (q.type === 'drag_drop' && options.zones) {
        correctAnswer = {
          zones: options.zones.map((z: any) => ({
            id: z.id,
            correct_item_ids: z.correct_item_ids,
          })),
        }
      }

      return {
        challenge_id: challengeId,
        question_type: q.type,
        question_text: q.question_text,
        options: q.options,
        correct_answer: correctAnswer,
        points: q.points || 1,
        display_order: startOrder + index,
        media_url: null,
      }
    })

    // Insert questions in batch
    const { data: insertedQuestions, error } = await supabase
      .from('challenge_questions')
      .insert(questionsToInsert)
      .select()

    if (error) {
      console.error('[Upload API] Error inserting questions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      questions_added: insertedQuestions?.length || 0,
      questions: insertedQuestions || [],
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Upload API] Error in POST:', error)

    // Handle permission errors
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
