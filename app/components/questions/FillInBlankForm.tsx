'use client'

import { Question, QuestionField } from '../../../lib/questions'
import { UserPreferences } from '../../../lib/preferences/useUserPreferences'
import { useState } from 'react'

interface FillInBlankFormProps {
  question: Question
  onSubmit: (params: Record<string, any>) => void
  defaultPreferences?: UserPreferences
}

export function FillInBlankForm({
  question,
  onSubmit,
  defaultPreferences,
}: FillInBlankFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(
    question.fillInBlanks.reduce(
      (acc, field) => {
        // Use default preference if available, otherwise use field default
        if (field.name === 'team' && defaultPreferences?.team) {
          acc[field.name] = defaultPreferences.team
        } else if (field.name === 'metric' && defaultPreferences?.defaultMetric) {
          acc[field.name] = defaultPreferences.defaultMetric
        } else {
          acc[field.name] = field.defaultValue || ''
        }
        return acc
      },
      {} as Record<string, any>,
    ),
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    question.fillInBlanks.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {question.fillInBlanks.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>

          {field.type === 'select' && field.options ? (
            <select
              id={field.name}
              name={field.name}
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              <option value="">Select an option...</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon ? `${option.icon} ` : ''} {option.label}
                </option>
              ))}
            </select>
          ) : field.type === 'number' ? (
            <input
              id={field.name}
              name={field.name}
              type="number"
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          ) : field.type === 'date' ? (
            <input
              id={field.name}
              name={field.name}
              type="date"
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          ) : (
            <input
              id={field.name}
              name={field.name}
              type="text"
              value={formData[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          )}

          {errors[field.name] && (
            <p className="mt-1 text-sm text-red-500">{errors[field.name]}</p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Running Analysis...' : 'Run Analysis'}
      </button>
    </form>
  )
}
