'use client'

/**
 * MC Bible - Quiz Editor Component
 * Allows content creators to add/edit quizzes in articles
 */

import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { QuizQuestion } from '@/lib/types/bible'
import { bible } from '@/lib/design-tokens'

interface QuizEditorProps {
  initialQuestions?: QuizQuestion[]
  onChange: (questions: QuizQuestion[]) => void
}

export function QuizEditor({ initialQuestions = [], onChange }: QuizEditorProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions)

  const updateQuestions = (newQuestions: QuizQuestion[]) => {
    setQuestions(newQuestions)
    onChange(newQuestions)
  }

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      explanation: '',
    }
    updateQuestions([...questions, newQuestion])
  }

  const removeQuestion = (index: number) => {
    updateQuestions(questions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    updateQuestions(newQuestions)
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions]
    const newOptions = [...newQuestions[questionIndex].options]
    newOptions[optionIndex] = value
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      options: newOptions,
    }
    updateQuestions(newQuestions)
  }

  const setCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    updateQuestions(questionIndex, 'correct_answer', optionIndex)
  }

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions]
    const newOptions = [...newQuestions[questionIndex].options, '']
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      options: newOptions,
    }
    updateQuestions(newQuestions)
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    if (questions[questionIndex].options.length <= 2) return // Minimum 2 options

    const newQuestions = [...questions]
    const newOptions = newQuestions[questionIndex].options.filter((_, i) => i !== optionIndex)

    // Adjust correct_answer if needed
    let correctAnswer = newQuestions[questionIndex].correct_answer
    if (correctAnswer === optionIndex) {
      correctAnswer = 0 // Reset to first option if removing correct one
    } else if (correctAnswer > optionIndex) {
      correctAnswer-- // Adjust index if removing an option before correct one
    }

    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      options: newOptions,
      correct_answer: correctAnswer,
    }
    updateQuestions(newQuestions)
  }

  return (
    <div className={bible.spacing.sectionGap}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={bible.typography.quizTitle}>Quiz Questions</h3>
          <p className={`${bible.typography.buttonText} text-muted-foreground`}>
            Add quiz questions to test understanding
          </p>
        </div>
        <Button onClick={addQuestion} size="sm">
          <Plus className={`${bible.iconSizes.sm} mr-2`} />
          Add Question
        </Button>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <p>No quiz questions yet</p>
              <p className={`${bible.typography.buttonText} mt-1`}>Click "Add Question" to create your first question</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={bible.spacing.sectionGap}>
          {questions.map((question, qIdx) => (
            <Card key={qIdx}>
              <CardHeader className="pb-4">
                <div className={`flex items-start justify-between ${bible.spacing.formGap}`}>
                  <div className={`flex items-start ${bible.spacing.listGap} flex-1`}>
                    <div className="flex-shrink-0 mt-1 text-muted-foreground cursor-grab">
                      <GripVertical className={bible.iconSizes.md} />
                    </div>
                    <div className={`flex-1 ${bible.spacing.itemGap}`}>
                      <div className={`flex items-center ${bible.spacing.buttonGap}`}>
                        <Badge variant="outline">Question {qIdx + 1}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(qIdx)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className={bible.iconSizes.sm} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={bible.spacing.sectionGap}>
                {/* Question Text */}
                <div>
                  <label className={`${bible.typography.buttonText} font-medium mb-2 block`}>Question</label>
                  <Textarea
                    placeholder="Enter your question here..."
                    value={question.question}
                    onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Options */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`${bible.typography.buttonText} font-medium`}>Options</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addOption(qIdx)}
                      disabled={question.options.length >= 6}
                    >
                      <Plus className={`${bible.iconSizes.xs} mr-1`} />
                      Add Option
                    </Button>
                  </div>
                  <div className={bible.spacing.itemGap}>
                    {question.options.map((option, oIdx) => (
                      <div key={oIdx} className={`flex items-center ${bible.spacing.buttonGap}`}>
                        <div className={`flex items-center ${bible.spacing.buttonGap} flex-1`}>
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={question.correct_answer === oIdx}
                            onChange={() => setCorrectAnswer(qIdx, oIdx)}
                            className="cursor-pointer"
                          />
                          <Input
                            placeholder={`Option ${oIdx + 1}`}
                            value={option}
                            onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          />
                        </div>
                        {question.options.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(qIdx, oIdx)}
                          >
                            <Trash2 className={bible.iconSizes.xs} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className={`${bible.typography.badgeText} text-muted-foreground mt-1`}>
                    Select the radio button next to the correct answer
                  </p>
                </div>

                {/* Explanation */}
                <div>
                  <label className={`${bible.typography.buttonText} font-medium mb-2 block`}>Explanation (Optional)</label>
                  <Textarea
                    placeholder="Explain why this is the correct answer..."
                    value={question.explanation || ''}
                    onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)}
                    rows={2}
                  />
                  <p className={`${bible.typography.badgeText} text-muted-foreground mt-1`}>
                    This will be shown after the user answers the question
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Validation Helper */}
      {questions.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className={`${bible.spacing.itemGap} ${bible.typography.buttonText}`}>
              <p className="font-medium">Quiz Checklist:</p>
              <ul className={`${bible.spacing.itemGap} text-muted-foreground`}>
                <li className={questions.every(q => q.question.trim()) ? 'text-green-600' : 'text-amber-600'}>
                  {questions.filter(q => q.question.trim()).length} / {questions.length} questions have text
                </li>
                <li className={questions.every(q => q.options.every(o => o.trim())) ? 'text-green-600' : 'text-amber-600'}>
                  {questions.flatMap(q => q.options).filter(o => o.trim()).length} / {questions.flatMap(q => q.options).length} options filled
                </li>
                <li className={questions.every(q => q.options.length >= 2) ? 'text-green-600' : 'text-amber-600'}>
                  All questions have at least 2 options
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
