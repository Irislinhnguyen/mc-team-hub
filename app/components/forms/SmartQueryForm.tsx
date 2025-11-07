'use client'

import { useState } from 'react'
import { FormField, QueryConfig, QuestionTemplate } from '../../../lib/questions/templates'
import { PromptPreview } from './PromptPreview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SmartQueryFormProps {
  template: QuestionTemplate
  onSubmit: (config: QueryConfig) => void
  isLoading?: boolean
}

export function SmartQueryForm({ template, onSubmit, isLoading = false }: SmartQueryFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fields = template.getFormFields()

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
    // Clear error for this field when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate using template validation
    const validationError = template.validateConfig(formData as QueryConfig)
    if (validationError) {
      setErrors({ form: validationError })
      return
    }

    // Call parent handler
    onSubmit(formData as QueryConfig)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{template.title}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General form errors */}
          {errors.form && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700 font-medium">{errors.form}</p>
            </div>
          )}

          {/* Prompt Preview */}
          <PromptPreview template={template} formData={formData} />

          {/* Form fields */}
          <div className="space-y-4">
            {fields.map((field) => (
              <FormFieldRenderer
                key={field.name}
                field={field}
                value={formData[field.name]}
                onChange={(value) => handleFieldChange(field.name, value)}
                error={errors[field.name]}
              />
            ))}
          </div>

          {/* Submit button */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Processing...' : 'Run Analysis'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

interface FormFieldRendererProps {
  field: FormField
  value: any
  onChange: (value: any) => void
  error?: string
}

function FormFieldRenderer({ field, value, onChange, error }: FormFieldRendererProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={field.name} className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>

      {field.type === 'select' && (
        <SelectField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
        />
      )}

      {field.type === 'multiselect' && (
        <MultiSelectField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
        />
      )}

      {field.type === 'text' && (
        <TextInputField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
        />
      )}

      {field.type === 'number' && (
        <NumberInputField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
        />
      )}

      {field.type === 'checkbox' && (
        <CheckboxField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
        />
      )}

      {field.type === 'radio' && (
        <RadioField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
        />
      )}

      {field.helpText && (
        <p className="text-xs text-gray-500">{field.helpText}</p>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}

function SelectField({ field, value, onChange, error }: FormFieldRendererProps) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className={error ? 'border-red-500' : ''}>
        <SelectValue placeholder={field.placeholder || `Chọn ${field.label}`} />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map((opt) => (
          <SelectItem key={opt.value} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function MultiSelectField({ field, value, onChange, error }: FormFieldRendererProps) {
  const selectedValues = Array.isArray(value) ? value : []

  const handleChange = (val: string | number) => {
    const updated = selectedValues.includes(val)
      ? selectedValues.filter((v) => v !== val)
      : [...selectedValues, val]
    onChange(updated)
  }

  return (
    <div className={`space-y-2 rounded-md border p-3 ${error ? 'border-red-500' : 'border-gray-300'}`}>
      {field.options?.map((opt) => (
        <div key={opt.value} className="flex items-center gap-2">
          <Checkbox
            id={`${field.name}-${opt.value}`}
            checked={selectedValues.includes(opt.value)}
            onCheckedChange={() => handleChange(opt.value)}
          />
          <label
            htmlFor={`${field.name}-${opt.value}`}
            className="flex-1 text-sm cursor-pointer"
          >
            {opt.label}
          </label>
        </div>
      ))}
    </div>
  )
}

function TextInputField({ field, value, onChange, error }: FormFieldRendererProps) {
  return (
    <Input
      id={field.name}
      type="text"
      placeholder={field.placeholder}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={error ? 'border-red-500' : ''}
    />
  )
}

function NumberInputField({ field, value, onChange, error }: FormFieldRendererProps) {
  return (
    <Input
      id={field.name}
      type="number"
      placeholder={field.placeholder}
      value={value || ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
      className={error ? 'border-red-500' : ''}
    />
  )
}

function CheckboxField({ field, value, onChange, error }: FormFieldRendererProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={field.name}
        checked={value || false}
        onCheckedChange={(checked) => onChange(checked)}
      />
      <label htmlFor={field.name} className="text-sm cursor-pointer">
        {field.label}
      </label>
    </div>
  )
}

function RadioField({ field, value, onChange, error }: FormFieldRendererProps) {
  return (
    <div className="space-y-2">
      {field.options?.map((opt) => (
        <div key={opt.value} className="flex items-center gap-2">
          <input
            type="radio"
            id={`${field.name}-${opt.value}`}
            name={field.name}
            value={opt.value}
            checked={value === opt.value || value === String(opt.value)}
            onChange={(e) => onChange(e.target.value)}
            className="h-4 w-4"
          />
          <label
            htmlFor={`${field.name}-${opt.value}`}
            className="text-sm cursor-pointer"
          >
            {opt.label}
          </label>
        </div>
      ))}
    </div>
  )
}
