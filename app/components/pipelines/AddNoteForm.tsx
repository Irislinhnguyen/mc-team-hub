'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAddPipelineNote } from '@/lib/hooks/queries/usePipelineActivities'
import { toast } from 'sonner'

interface AddNoteFormProps {
  pipelineId: string
}

export function AddNoteForm({ pipelineId }: AddNoteFormProps) {
  const [notes, setNotes] = useState('')
  const { mutate: addNote, isPending } = useAddPipelineNote(pipelineId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) return

    addNote(notes.trim(), {
      onSuccess: () => {
        setNotes('')
        toast.success('Note added')
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to add note')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add a note about this pipeline..."
        rows={3}
        className="resize-none"
        disabled={isPending}
      />
      <Button
        type="submit"
        size="sm"
        disabled={!notes.trim() || isPending}
        className="w-full"
      >
        {isPending ? 'Adding...' : 'Add Note'}
      </Button>
    </form>
  )
}
