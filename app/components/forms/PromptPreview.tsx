'use client'

import { useState } from 'react'
import { QuestionTemplate } from '../../../lib/questions/templates'
import { generatePreviewText } from '../../../lib/questions/promptGenerator'

interface PromptPreviewProps {
  template: QuestionTemplate
  formData: Record<string, any>
}

export function PromptPreview({ template, formData }: PromptPreviewProps) {
  const [copied, setCopied] = useState(false)
  const currentText = generatePreviewText(template, formData)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-6 p-4 border rounded-lg bg-slate-50 border-slate-200">
      <div className="flex items-start justify-between mb-3">
        <label className="text-sm font-semibold text-slate-700">Preview</label>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="text-sm text-slate-800 leading-relaxed font-medium">
        {currentText}
      </div>
    </div>
  )
}
