import * as React from 'react'
import { UseFormReturn, FieldValues } from 'react-hook-form'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'

export interface AdminFormProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>
  onSubmit: (data: TFieldValues) => void | Promise<void>
  children: React.ReactNode
  submitLabel?: string
  isLoading?: boolean
}

export function AdminForm<TFieldValues extends FieldValues>({
  form,
  onSubmit,
  children,
  submitLabel = 'Submit',
  isLoading = false,
}: AdminFormProps<TFieldValues>) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {children}
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
