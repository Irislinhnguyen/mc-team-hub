'use client'

/**
 * MC Bible - Quiz Component
 * Displays interactive quizzes embedded in articles
 */

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import type { QuizQuestion } from '@/lib/types/bible'
import { bible } from '@/lib/design-tokens'

interface QuizProps {
  questions: QuizQuestion[]
  articleId: string
  onComplete?: (score: number, total: number) => void
}

interface QuizState {
  answers: Record<number, number> // question index -> selected option index
  submitted: Record<number, boolean> // question index -> whether submitted
  results: Record<number, boolean> // question index -> correct/incorrect
}

export function Quiz({ questions, articleId, onComplete }: QuizProps) {
  const { toast } = useToast()
  const [quizState, setQuizState] = useState<QuizState>({
    answers: {},
    submitted: {},
    results: {},
  })
  const [showResults, setShowResults] = useState(false)
  const [existingAttempt, setExistingAttempt] = useState<any>(null)
  const [loadingAttempt, setLoadingAttempt] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Check for existing attempt on mount
  useEffect(() => {
    async function checkExistingAttempt() {
      try {
        const response = await fetch(`/api/bible/articles/${articleId}/quiz`)
        if (response.ok) {
          const data = await response.json()
          if (data.hasAttempt) {
            setExistingAttempt(data.attempt)
          }
        }
      } catch (error) {
        console.error('Error checking quiz attempt:', error)
      } finally {
        setLoadingAttempt(false)
      }
    }

    checkExistingAttempt()
  }, [articleId])

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    // Don't allow changing answer after submission
    if (quizState.submitted[questionIndex]) return

    setQuizState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionIndex]: optionIndex,
      },
    }))
  }

  const handleSubmitQuestion = (questionIndex: number) => {
    const selectedOption = quizState.answers[questionIndex]
    if (selectedOption === undefined) return

    const question = questions[questionIndex]
    const isCorrect = selectedOption === question.correct_answer

    setQuizState(prev => ({
      ...prev,
      submitted: {
        ...prev.submitted,
        [questionIndex]: true,
      },
      results: {
        ...prev.results,
        [questionIndex]: isCorrect,
      },
    }))

    // Check if all questions are submitted
    const allSubmitted = Object.keys(quizState.submitted).length + 1 >= questions.length
    if (allSubmitted && onComplete) {
      const correctCount = Object.values({ ...quizState.results, [questionIndex]: isCorrect })
        .filter(Boolean).length
      onComplete(correctCount, questions.length)
    }
  }

  const handleSubmitAll = async () => {
    // Submit all unanswered questions
    const newSubmitted = { ...quizState.submitted }
    const newResults = { ...quizState.results }

    questions.forEach((_, idx) => {
      if (!quizState.submitted[idx] && quizState.answers[idx] !== undefined) {
        newSubmitted[idx] = true
        newResults[idx] = quizState.answers[idx] === questions[idx].correct_answer
      }
    })

    setQuizState(prev => ({
      ...prev,
      submitted: newSubmitted,
      results: newResults,
    }))
    setShowResults(true)

    // Calculate final score
    const correctCount = Object.values(newResults).filter(Boolean).length
    if (onComplete) {
      onComplete(correctCount, questions.length)
    }

    // Submit to API
    setSubmitting(true)
    try {
      const answersArray = questions.map((q, idx) => ({
        questionIndex: idx,
        selectedOption: quizState.answers[idx],
        isCorrect: newResults[idx],
      }))

      const response = await fetch(`/api/bible/articles/${articleId}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: correctCount,
          total_questions: questions.length,
          answers: answersArray,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (response.status === 400 && error.error?.includes('already attempted')) {
          toast({
            title: 'Already Completed',
            description: 'You have already completed this quiz.',
            variant: 'default',
          })
        } else {
          throw new Error(error.error || 'Failed to submit quiz')
        }
      } else {
        const data = await response.json()
        setExistingAttempt(data.attempt)
        toast({
          title: 'Quiz Completed!',
          description: `You scored ${correctCount} out of ${questions.length} (${Math.round((correctCount / questions.length) * 100)}%)`,
        })
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit quiz results. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const answeredCount = Object.keys(quizState.answers).length
  const submittedCount = Object.keys(quizState.submitted).length
  const correctCount = Object.values(quizState.results).filter(Boolean).length

  // Show loading state
  if (loadingAttempt) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className={`${bible.iconSizes.md} animate-spin text-muted-foreground`} />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show existing attempt
  if (existingAttempt) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className={bible.spacing.sectionGap}>
            <div className="flex items-center justify-between">
              <h3 className={bible.typography.quizTitle}>Quiz Completed</h3>
              <span className={`${bible.typography.buttonText} text-muted-foreground`}>
                {new Date(existingAttempt.completed_at).toLocaleDateString()}
              </span>
            </div>
            <div className={`${bible.spacing.cardPadding} rounded-lg bg-primary/10`}>
              <p className="text-center font-medium">
                You scored {existingAttempt.score} out of {existingAttempt.total_questions} ({existingAttempt.percentage}%)
              </p>
            </div>
            <p className={`${bible.typography.buttonText} text-muted-foreground text-center`}>
              You have already completed this quiz. Only one attempt is allowed per article.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={bible.spacing.sectionGapLoose}>
      {/* Quiz Header */}
      <Card>
        <CardContent className="pt-6">
          <div className={bible.spacing.sectionGap}>
            <div className="flex items-center justify-between">
              <h3 className={bible.typography.quizTitle}>Quiz</h3>
              <span className={`${bible.typography.buttonText} text-muted-foreground`}>
                {answeredCount} / {questions.length} answered
              </span>
            </div>
            <Progress value={(answeredCount / questions.length) * 100} />

            {showResults && (
              <div className={`${bible.spacing.cardPadding} rounded-lg bg-primary/10`}>
                <p className="text-center font-medium">
                  You scored {correctCount} out of {questions.length} ({Math.round((correctCount / questions.length) * 100)}%)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className={bible.spacing.sectionGap}>
        {questions.map((question, qIdx) => {
          const selectedOption = quizState.answers[qIdx]
          const isSubmitted = quizState.submitted[qIdx]
          const isCorrect = quizState.results[qIdx]
          const correctOption = question.correct_answer

          return (
            <Card key={qIdx} className={isSubmitted ? (isCorrect ? 'border-green-500' : 'border-red-500') : ''}>
              <CardContent className="pt-6">
                <div className={bible.spacing.sectionGap}>
                  {/* Question */}
                  <div>
                    <p className="font-medium mb-1">
                      {qIdx + 1}. {question.question}
                    </p>
                    {isSubmitted && (
                      <div className={`flex items-center ${bible.spacing.buttonGap} ${bible.typography.buttonText} ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className={bible.iconSizes.sm} />
                            Correct!
                          </>
                        ) : (
                          <>
                            <XCircle className={bible.iconSizes.sm} />
                            Incorrect
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className={bible.spacing.itemGap}>
                    {question.options.map((option, oIdx) => {
                      const isSelected = selectedOption === oIdx
                      const showCorrect = isSubmitted && oIdx === correctOption
                      const showIncorrect = isSubmitted && isSelected && !isCorrect

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(qIdx, oIdx)}
                          disabled={isSubmitted}
                          className={`w-full text-left ${bible.spacing.cardPadding} rounded-lg border transition-all ${
                            isSelected && !isSubmitted
                              ? 'border-primary bg-primary/10'
                              : showCorrect
                                ? 'border-green-500 bg-green-50 dark:bg-green-950'
                                : showIncorrect
                                  ? 'border-red-500 bg-red-50 dark:bg-red-950'
                                  : 'hover:bg-accent'
                          } ${isSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div className={`flex items-start ${bible.spacing.listGap}`}>
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : showCorrect
                                  ? 'border-green-500 bg-green-500 text-white'
                                  : showIncorrect
                                    ? 'border-red-500 bg-red-500 text-white'
                                    : 'border-muted-foreground'
                            }`}>
                              {showCorrect ? (
                                <CheckCircle2 className={bible.iconSizes.xs} />
                              ) : showIncorrect ? (
                                <XCircle className={bible.iconSizes.xs} />
                              ) : (
                                <span className={bible.typography.badgeText}>{oIdx + 1}</span>
                              )}
                            </div>
                            <span className="flex-1">{option}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Explanation */}
                  {isSubmitted && question.explanation && (
                    <details className="group">
                      <summary className={`flex items-center ${bible.spacing.buttonGap} cursor-pointer ${bible.typography.buttonText} font-medium text-muted-foreground hover:text-foreground list-none`}>
                        <ChevronDown className={`${bible.iconSizes.sm} transition-transform group-open:rotate-180`} />
                        Explanation
                      </summary>
                      <p className={`mt-2 ${bible.typography.buttonText} text-muted-foreground pl-6`}>
                        {question.explanation}
                      </p>
                    </details>
                  )}

                  {/* Submit Button (per question) */}
                  {!isSubmitted && selectedOption !== undefined && (
                    <Button
                      size="sm"
                      onClick={() => handleSubmitQuestion(qIdx)}
                      disabled={selectedOption === undefined}
                    >
                      Submit Answer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Submit All Button */}
      {!showResults && answeredCount > 0 && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmitAll}
            disabled={answeredCount === 0 || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className={`${bible.iconSizes.sm} mr-2 animate-spin`} />
                Submitting...
              </>
            ) : (
              'Submit All Answers'
            )}
          </Button>
        </div>
      )}

      {/* Retry Button */}
      {showResults && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              setQuizState({
                answers: {},
                submitted: {},
                results: {},
              })
              setShowResults(false)
            }}
          >
            Retake Quiz
          </Button>
        </div>
      )}
    </div>
  )
}
