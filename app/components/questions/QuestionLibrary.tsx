'use client'

import { QUESTIONS, Question } from '../../../lib/questions'
import { useUserPreferences } from '../../../lib/preferences/useUserPreferences'
import { QuestionCard } from './QuestionCard'
import { SearchBar } from './SearchBar'
import { useState } from 'react'

interface QuestionLibraryProps {
  onSelectQuestion: (question: Question) => void
}

export function QuestionLibrary({ onSelectQuestion }: QuestionLibraryProps) {
  const [displayedQuestions, setDisplayedQuestions] = useState<Question[]>(QUESTIONS)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const { preferences } = useUserPreferences()

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setDisplayedQuestions(QUESTIONS)
      return
    }

    const lowerQuery = query.toLowerCase()
    const filtered = QUESTIONS.filter((q) => {
      const titleMatch = q.title.toLowerCase().includes(lowerQuery)
      const subtitleMatch = q.subtitle?.toLowerCase().includes(lowerQuery) ?? false
      const descriptionMatch = q.description.toLowerCase().includes(lowerQuery)
      const keywordMatch = q.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery))

      return titleMatch || subtitleMatch || descriptionMatch || keywordMatch
    })

    setDisplayedQuestions(filtered)
  }

  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestionId(question.id)
    onSelectQuestion(question)
  }

  // Show favorite questions first if any exist
  const favoriteQuestions = preferences?.favoriteQuestions
    ? QUESTIONS.filter((q) => preferences.favoriteQuestions.includes(q.id))
    : []

  const otherQuestions = QUESTIONS.filter(
    (q) => !preferences?.favoriteQuestions?.includes(q.id),
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Ask a question about your data</h2>
        <SearchBar onSelectQuestion={handleSelectQuestion} onSearch={handleSearch} />
      </div>

      {favoriteQuestions.length > 0 && displayedQuestions.length === QUESTIONS.length && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-700">Your Favorites</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onAnalyze={() => handleSelectQuestion(question)}
                isSelected={selectedQuestionId === question.id}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        {displayedQuestions.length === QUESTIONS.length && favoriteQuestions.length > 0 ? (
          <h3 className="mb-3 text-sm font-medium text-gray-700">All Questions</h3>
        ) : displayedQuestions.length !== QUESTIONS.length ? (
          <h3 className="mb-3 text-sm font-medium text-gray-700">
            Found {displayedQuestions.length} question{displayedQuestions.length !== 1 ? 's' : ''}
          </h3>
        ) : null}

        {displayedQuestions.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(displayedQuestions.length === QUESTIONS.length
              ? otherQuestions
              : displayedQuestions
            ).map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onAnalyze={() => handleSelectQuestion(question)}
                isSelected={selectedQuestionId === question.id}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No questions found matching your search</p>
            <p className="mt-2 text-sm text-gray-500">Try different keywords</p>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-medium">Tip:</p>
        <p className="mt-1">
          Click on any question, fill in the blanks with your preferences, and we'll fetch real
          data from BigQuery for your analysis.
        </p>
      </div>
    </div>
  )
}
