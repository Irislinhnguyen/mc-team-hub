'use client'

import { useState } from 'react'
import { ALL_QUESTION_TEMPLATES, QuestionTemplate } from '../../../lib/questions/templates'
import { SmartQueryForm } from '../forms/SmartQueryForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface TemplateSelectorProps {
  onSubmit: (config: any) => void
  isLoading?: boolean
}

export function TemplateSelector({ onSubmit, isLoading = false }: TemplateSelectorProps) {
  const [activeTemplate, setActiveTemplate] = useState<string>(ALL_QUESTION_TEMPLATES[0].id)

  const selectedTemplate = ALL_QUESTION_TEMPLATES.find((t) => t.id === activeTemplate)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Data Analysis</h1>
        <p className="mt-2 text-gray-600">
          Choose the type of analysis you want to perform
        </p>
      </div>

      {/* Template tabs */}
      <Tabs value={activeTemplate} onValueChange={setActiveTemplate} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {ALL_QUESTION_TEMPLATES.map((template) => (
            <TabsTrigger key={template.id} value={template.id} className="text-xs sm:text-sm">
              {getTemplateLabel(template.id)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Template forms - Only render active tab for performance */}
        {ALL_QUESTION_TEMPLATES.map((template) => {
          // Only render the active tab content to improve initial load performance
          if (template.id !== activeTemplate) {
            return <TabsContent key={template.id} value={template.id} className="mt-6" />
          }

          return (
            <TabsContent key={template.id} value={template.id} className="mt-6">
              <SmartQueryForm
                template={template}
                onSubmit={onSubmit}
                isLoading={isLoading}
              />
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Template info cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ALL_QUESTION_TEMPLATES.map((template) => (
          <TemplateInfoCard
            key={template.id}
            template={template}
            isActive={activeTemplate === template.id}
            onSelect={() => setActiveTemplate(template.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface TemplateInfoCardProps {
  template: QuestionTemplate
  isActive: boolean
  onSelect: () => void
}

function TemplateInfoCard({ template, isActive, onSelect }: TemplateInfoCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        isActive
          ? 'border-blue-500 bg-blue-50 shadow-lg'
          : 'hover:shadow-md'
      }`}
      onClick={onSelect}
    >
      <CardHeader>
        <CardTitle className="text-lg">{template.title}</CardTitle>
        <CardDescription className="text-xs">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-600">
          {getTemplateExamples(template.id)}
        </p>
      </CardContent>
    </Card>
  )
}

function getTemplateLabel(id: string): string {
  const labels: Record<string, string> = {
    check_and_explain: 'Check & Explain',
    compare: 'Compare',
    rank: 'Rank',
    suggest: 'Suggest',
    personal: 'Personal',
  }
  return labels[id] || id
}

function getTemplateExamples(id: string): string {
  const examples: Record<string, string> = {
    check_and_explain:
      'Ex: Why did zone revenue drop this week vs last week?',
    compare: 'Ex: Compare Flexible Sticky vs WipeAd performance',
    rank: 'Ex: Top 10 publishers with highest revenue this month',
    suggest:
      'Ex: Upsell opportunities for PID123 or churn risk warning',
    personal: 'Ex: View my metrics (PIC) broken down by pid/zone/format',
  }
  return examples[id] || ''
}
