/**
 * Auto-Grading Logic for Challenge Questions
 * Handles automatic grading for Cloze and Drag-Drop question types
 */

import type {
  ChallengeQuestion,
  ChallengeAnswer,
  ClozeQuestionOptions,
  DragDropQuestionOptions,
} from '@/lib/types/challenge'

// =====================================================
// Auto-Grade Result
// =====================================================

export interface AutoGradeResult {
  score: number
  maxScore: number
  is_correct: boolean | null // null for partial credit
  feedback: string
}

// =====================================================
// Cloze Question Auto-Grader
// =====================================================

export interface ClozeAnswer {
  gaps: Record<string, string> // gap ID -> selected choice
}

/**
 * Grade a cloze (fill-in-the-blank) answer
 */
export function gradeClozeAnswer(
  question: ChallengeQuestion,
  answer: ClozeAnswer
): AutoGradeResult {
  const options = question.options as ClozeQuestionOptions

  if (!options.gaps || options.gaps.length === 0) {
    return {
      score: 0,
      maxScore: question.points,
      is_correct: false,
      feedback: 'No valid gaps found in question',
    }
  }

  let correctCount = 0
  const feedbacks: string[] = []

  for (const gap of options.gaps) {
    const userAnswer = answer.gaps?.[gap.id]
    const correctChoice = gap.choices[gap.correct_index]
    const isCorrect = userAnswer === correctChoice

    if (isCorrect) {
      correctCount++
      feedbacks.push(`✓ ${gap.id}: Correct`)
    } else {
      feedbacks.push(`✗ ${gap.id}: Incorrect (answered: "${userAnswer || '(empty)'}")`)
    }
  }

  const totalGaps = options.gaps.length
  const scorePerGap = question.points / totalGaps
  const totalScore = Math.round((correctCount * scorePerGap) * 100) / 100

  return {
    score: totalScore,
    maxScore: question.points,
    is_correct: correctCount === totalGaps,
    feedback: feedbacks.join('\n'),
  }
}

// =====================================================
// Drag-Drop Question Auto-Grader
// =====================================================

export interface DragDropAnswer {
  placements: Record<string, string> // zone ID -> item ID
}

/**
 * Grade a drag-drop answer
 */
export function gradeDragDropAnswer(
  question: ChallengeQuestion,
  answer: DragDropAnswer
): AutoGradeResult {
  const options = question.options as DragDropQuestionOptions

  if (!options.zones || options.zones.length === 0) {
    return {
      score: 0,
      maxScore: question.points,
      is_correct: false,
      feedback: 'No valid zones found in question',
    }
  }

  let correctCount = 0
  const feedbacks: string[] = []

  for (const zone of options.zones) {
    const placedItemId = answer.placements?.[zone.id]
    const isCorrect = zone.correct_item_ids.includes(placedItemId)

    if (isCorrect) {
      correctCount++
      feedbacks.push(`✓ ${zone.label || zone.id}: Correct`)
    } else {
      feedbacks.push(
        `✗ ${zone.label || zone.id}: Incorrect (placed: "${placedItemId || '(empty)'}")`
      )
    }
  }

  const totalZones = options.zones.length
  const scorePerZone = question.points / totalZones
  const totalScore = Math.round((correctCount * scorePerZone) * 100) / 100

  return {
    score: totalScore,
    maxScore: question.points,
    is_correct: correctCount === totalZones,
    feedback: `${correctCount} of ${totalZones} items correctly placed`,
  }
}

// =====================================================
// Main Auto-Grade Function
// =====================================================

/**
 * Auto-grade an answer based on question type
 */
export function autoGradeAnswer(
  question: ChallengeQuestion,
  answerData: any,
  answerText?: string | null
): AutoGradeResult {
  switch (question.question_type) {
    case 'cloze':
      // Parse cloze answer from answer_data (JSON object mapping gap IDs to choices)
      return gradeClozeAnswer(question, answerData || {})

    case 'drag_drop':
      // Parse drag-drop answer from answer_data (JSON object mapping zone IDs to item IDs)
      return gradeDragDropAnswer(question, answerData || {})

    case 'essay':
      // Essays require manual grading
      return {
        score: 0,
        maxScore: question.points,
        is_correct: null,
        feedback: 'Essay questions require manual grading',
      }

    default:
      return {
        score: 0,
        maxScore: question.points,
        is_correct: false,
        feedback: 'Unknown question type',
      }
  }
}

// =====================================================
// Batch Auto-Grading for Submission
// =====================================================

/**
 * Auto-grade all auto-gradable answers in a submission
 * Returns the auto-score and max score from auto-graded questions
 */
export interface SubmissionAutoGradeResult {
  total_auto_score: number
  total_auto_max_score: number
  results: Array<{
    answer_id: string
    question_id: string
    question_type: string
    result: AutoGradeResult
  }>
}

export async function autoGradeSubmission(
  questions: ChallengeQuestion[],
  answers: Array<{
    id: string
    question_id: string
    answer_text: string | null
    answer_data: any
  }>
): Promise<SubmissionAutoGradeResult> {
  const results: SubmissionAutoGradeResult['results'] = []
  let totalAutoScore = 0
  let totalAutoMaxScore = 0

  // Create a map of answers by question_id for quick lookup
  const answerMap = new Map(answers.map((a) => [a.question_id, a]))

  for (const question of questions) {
    const answer = answerMap.get(question.id)

    if (!answer) {
      continue // No answer provided for this question
    }

    // Only auto-grade cloze and drag-drop
    if (question.question_type === 'essay') {
      continue
    }

    const result = autoGradeAnswer(question, answer.answer_data, answer.answer_text)

    results.push({
      answer_id: answer.id,
      question_id: question.id,
      question_type: question.question_type,
      result,
    })

    totalAutoScore += result.score
    totalAutoMaxScore += result.maxScore
  }

  return {
    total_auto_score: Math.round(totalAutoScore * 100) / 100,
    total_auto_max_score: totalAutoMaxScore,
    results,
  }
}
