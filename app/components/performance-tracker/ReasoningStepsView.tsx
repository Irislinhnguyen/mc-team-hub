'use client'

/**
 * ReasoningStepsView Component
 *
 * Displays the 4-step Chain-of-Thought reasoning breakdown
 * with accordion UI and feedback inputs for each step
 */

import React, { useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../src/components/ui/accordion'
import { Button } from '../../../src/components/ui/button'
import { Textarea } from '../../../src/components/ui/textarea'
import { Badge } from '../../../src/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../src/components/ui/card'
import type { CoTReasoning, ReasoningStepNumber } from '../../../lib/types/reasoning'

interface ReasoningStepsViewProps {
  reasoning: CoTReasoning
  confidence: number
  onFeedback: (stepNumber: ReasoningStepNumber, feedback: string) => Promise<void>
  onConfirm: () => void
  onRegenerate: () => void
  isLoading?: boolean
}

export default function ReasoningStepsView({
  reasoning,
  confidence,
  onFeedback,
  onConfirm,
  onRegenerate,
  isLoading = false
}: ReasoningStepsViewProps) {
  const [feedbackInputs, setFeedbackInputs] = useState<Record<number, string>>({})
  const [submittingStep, setSubmittingStep] = useState<number | null>(null)

  const handleFeedbackChange = (stepNumber: number, value: string) => {
    setFeedbackInputs(prev => ({ ...prev, [stepNumber]: value }))
  }

  const handleSubmitFeedback = async (stepNumber: ReasoningStepNumber) => {
    const feedback = feedbackInputs[stepNumber]
    if (!feedback || feedback.trim() === '') {
      return
    }

    setSubmittingStep(stepNumber)
    try {
      await onFeedback(stepNumber, feedback.trim())
      // Clear feedback input after successful submission
      setFeedbackInputs(prev => ({ ...prev, [stepNumber]: '' }))
    } finally {
      setSubmittingStep(null)
    }
  }

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'bg-green-500'
    if (conf >= 0.7) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  const getConfidenceText = (conf: number) => {
    if (conf >= 0.9) return 'High'
    if (conf >= 0.7) return 'Medium'
    return 'Low'
  }

  return (
    <div className="space-y-4">
      {/* Header with Confidence */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Reasoning Breakdown</h3>
        <Badge className={getConfidenceColor(confidence)}>
          Confidence: {getConfidenceText(confidence)} ({(confidence * 100).toFixed(0)}%)
        </Badge>
      </div>

      {/* 4-Step Accordion */}
      <Accordion type="single" collapsible defaultValue="step-1" className="w-full">
        {/* Step 1: Understanding */}
        <AccordionItem value="step-1">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">1</span>
              <span>Understanding the Question</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Question Type:</p>
                  <p className="font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded mt-1">
                    {reasoning.step1_understanding.question_type}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Entities:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {reasoning.step1_understanding.entities.map((entity, idx) => (
                      <Badge key={idx} variant="outline">{entity}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Periods:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {reasoning.step1_understanding.time_periods.map((period, idx) => (
                      <li key={idx} className="text-sm">{period}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Key Insight:</p>
                  <p className="text-sm bg-blue-50 dark:bg-blue-950 p-3 rounded mt-1 border-l-4 border-blue-500">
                    {reasoning.step1_understanding.key_insight}
                  </p>
                </div>

                {/* Feedback Input */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">💬 Feedback on this step:</p>
                  <Textarea
                    placeholder="Any corrections or clarifications? (Optional)"
                    value={feedbackInputs[1] || ''}
                    onChange={(e) => handleFeedbackChange(1, e.target.value)}
                    className="min-h-[80px]"
                    disabled={isLoading || submittingStep === 1}
                  />
                  <Button
                    onClick={() => handleSubmitFeedback(1)}
                    disabled={!feedbackInputs[1] || isLoading || submittingStep === 1}
                    className="mt-2"
                    size="sm"
                  >
                    {submittingStep === 1 ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Step 2: Logic Breakdown */}
        <AccordionItem value="step-2">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded">2</span>
              <span>Breaking Down the Logic</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Logical Steps:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-2">
                    {reasoning.step2_breakdown.logic_steps.map((step, idx) => (
                      <li key={idx} className="text-sm">{step}</li>
                    ))}
                  </ol>
                </div>

                {reasoning.step2_breakdown.calculations && reasoning.step2_breakdown.calculations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Calculations:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {reasoning.step2_breakdown.calculations.map((calc, idx) => (
                        <li key={idx} className="text-sm font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          {calc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Feedback Input */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">💬 Feedback on this step:</p>
                  <Textarea
                    placeholder="Any corrections or clarifications? (Optional)"
                    value={feedbackInputs[2] || ''}
                    onChange={(e) => handleFeedbackChange(2, e.target.value)}
                    className="min-h-[80px]"
                    disabled={isLoading || submittingStep === 2}
                  />
                  <Button
                    onClick={() => handleSubmitFeedback(2)}
                    disabled={!feedbackInputs[2] || isLoading || submittingStep === 2}
                    className="mt-2"
                    size="sm"
                  >
                    {submittingStep === 2 ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Step 3: Constraints */}
        <AccordionItem value="step-3">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm bg-green-100 dark:bg-green-900 px-2 py-1 rounded">3</span>
              <span>Identifying Constraints</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date Ranges:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {reasoning.step3_constraints.date_ranges.map((range, idx) => (
                      <li key={idx} className="text-sm font-mono">{range}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Product Filter:</p>
                    <Badge variant={reasoning.step3_constraints.no_product_filter ? 'outline' : 'default'}>
                      {reasoning.step3_constraints.no_product_filter ? 'No' : 'Yes'}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">JOIN Required:</p>
                    <Badge variant={reasoning.step3_constraints.join_required ? 'default' : 'outline'}>
                      {reasoning.step3_constraints.join_required ? 'Yes' : 'No'}
                    </Badge>
                  </div>

                  {reasoning.step3_constraints.team_filter_needed !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Filter:</p>
                      <Badge variant={reasoning.step3_constraints.team_filter_needed ? 'default' : 'outline'}>
                        {reasoning.step3_constraints.team_filter_needed ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Feedback Input */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">💬 Feedback on this step:</p>
                  <Textarea
                    placeholder="Any corrections or clarifications? (Optional)"
                    value={feedbackInputs[3] || ''}
                    onChange={(e) => handleFeedbackChange(3, e.target.value)}
                    className="min-h-[80px]"
                    disabled={isLoading || submittingStep === 3}
                  />
                  <Button
                    onClick={() => handleSubmitFeedback(3)}
                    disabled={!feedbackInputs[3] || isLoading || submittingStep === 3}
                    className="mt-2"
                    size="sm"
                  >
                    {submittingStep === 3 ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Step 4: SQL Plan */}
        <AccordionItem value="step-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">4</span>
              <span>Planning SQL Structure</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardContent className="pt-6 space-y-4">
                {reasoning.step4_sql_plan.cte1 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CTE 1:</p>
                    <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded mt-1">
                      {reasoning.step4_sql_plan.cte1}
                    </p>
                  </div>
                )}

                {reasoning.step4_sql_plan.cte2 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CTE 2:</p>
                    <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded mt-1">
                      {reasoning.step4_sql_plan.cte2}
                    </p>
                  </div>
                )}

                {reasoning.step4_sql_plan.cte3 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CTE 3:</p>
                    <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded mt-1">
                      {reasoning.step4_sql_plan.cte3}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Main Query:</p>
                  <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded mt-1">
                    {reasoning.step4_sql_plan.main_query}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">ORDER BY:</p>
                  <p className="text-sm font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded mt-1">
                    {reasoning.step4_sql_plan.order_by}
                  </p>
                </div>

                {reasoning.step4_sql_plan.limit && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">LIMIT:</p>
                    <p className="text-sm font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded mt-1">
                      {reasoning.step4_sql_plan.limit}
                    </p>
                  </div>
                )}

                {/* Feedback Input */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">💬 Feedback on this step:</p>
                  <Textarea
                    placeholder="Any corrections or clarifications? (Optional)"
                    value={feedbackInputs[4] || ''}
                    onChange={(e) => handleFeedbackChange(4, e.target.value)}
                    className="min-h-[80px]"
                    disabled={isLoading || submittingStep === 4}
                  />
                  <Button
                    onClick={() => handleSubmitFeedback(4)}
                    disabled={!feedbackInputs[4] || isLoading || submittingStep === 4}
                    className="mt-2"
                    size="sm"
                  >
                    {submittingStep === 4 ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={onRegenerate}
          disabled={isLoading}
        >
          ← Regenerate Reasoning
        </Button>

        <Button
          onClick={onConfirm}
          disabled={isLoading || confidence < 0.7}
          className="bg-green-600 hover:bg-green-700"
        >
          {confidence < 0.7 ? 'Confidence Too Low - Provide Feedback' : '✓ Confirm & Generate SQL →'}
        </Button>
      </div>

      {confidence < 0.7 && (
        <p className="text-sm text-yellow-600 dark:text-yellow-500 text-center">
          ⚠️ Please provide feedback on at least one step to improve reasoning quality before proceeding
        </p>
      )}
    </div>
  )
}
