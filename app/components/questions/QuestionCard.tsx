'use client'

import { Question } from '../../../lib/questions'
import { useUserPreferences } from '../../../lib/preferences/useUserPreferences'
import { useState } from 'react'
import { FillInBlankForm } from './FillInBlankForm'

interface QuestionCardProps {
  question: Question
  onAnalyze?: (templateId: string, params: Record<string, any>) => void
  isSelected?: boolean
}

export function QuestionCard({ question, onAnalyze, isSelected = false }: QuestionCardProps) {
  const [showForm, setShowForm] = useState(false)
  const { preferences } = useUserPreferences()

  const handleSubmit = (params: Record<string, any>) => {
    if (onAnalyze) {
      onAnalyze(question.templateId, params)
    }
    setShowForm(false)
  }

  if (showForm) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <button
          onClick={() => setShowForm(false)}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          Back to questions
        </button>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{question.title}</h3>
        <p className="mb-4 text-sm text-gray-600">{question.description}</p>
        <FillInBlankForm
          question={question}
          onSubmit={handleSubmit}
          defaultPreferences={preferences}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className={`rounded-lg border-2 p-6 text-left transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
    >
      <h3 className="font-semibold text-gray-900">{question.title}</h3>
      {question.subtitle && <p className="text-sm text-gray-600">{question.subtitle}</p>}
      <p className="mt-2 text-xs text-gray-500">{question.description}</p>
      <div className="mt-4 inline-block text-sm font-medium text-blue-600">
        Answer Questions -&gt;
      </div>
    </button>
  )
}
