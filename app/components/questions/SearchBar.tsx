'use client'

import { QUESTIONS, searchQuestions, Question } from '../../../lib/questions'
import { useUserPreferences } from '../../../lib/preferences/useUserPreferences'
import { useState, useRef, useEffect } from 'react'

interface SearchBarProps {
  onSelectQuestion: (question: Question) => void
  onSearch?: (query: string) => void
}

export function SearchBar({ onSelectQuestion, onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<Question[]>([])
  const { preferences, addRecentSearch } = useUserPreferences()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim()) {
      const searchResults = searchQuestions(query)
      setResults(searchResults)
      onSearch?.(query)
    } else {
      setResults([])
    }
  }, [query, onSearch])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectQuestion = (question: Question) => {
    addRecentSearch(question.title)
    onSelectQuestion(question)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Ask a question... e.g., 'Why did revenue drop?' or 'Top publishers'"
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {query.trim() ? (
            <>
              {results.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <div className="border-b border-gray-100 px-4 py-2">
                    <p className="text-xs font-medium text-gray-500">
                      Found {results.length} question{results.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {results.map((question) => (
                    <button
                      key={question.id}
                      onClick={() => handleSelectQuestion(question)}
                      className="w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 transition-colors last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{question.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{question.title}</p>
                          <p className="text-sm text-gray-500">{question.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-gray-500">No matching questions found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try searching for: revenue, drop, publisher, format, growth, etc.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {preferences?.recentSearches && preferences.recentSearches.length > 0 && (
                <div className="border-b border-gray-100">
                  <div className="px-4 py-2">
                    <p className="text-xs font-medium text-gray-500">Recent</p>
                  </div>
                  {preferences.recentSearches.slice(0, 3).map((search) => {
                    const question = QUESTIONS.find((q) => q.title === search)
                    return question ? (
                      <button
                        key={search}
                        onClick={() => handleSelectQuestion(question)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {question.icon} {search}
                      </button>
                    ) : null
                  })}
                </div>
              )}
              <div>
                <div className="px-4 py-2">
                  <p className="text-xs font-medium text-gray-500">Popular Questions</p>
                </div>
                {QUESTIONS.slice(0, 5).map((question) => (
                  <button
                    key={question.id}
                    onClick={() => handleSelectQuestion(question)}
                    className="w-full border-t border-gray-50 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {question.icon} {question.title}
                    </p>
                    <p className="text-xs text-gray-500">{question.subtitle}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
