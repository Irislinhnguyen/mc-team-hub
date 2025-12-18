/**
 * Context Confirmation Dialog
 *
 * Shows when AI detects medium confidence (70-85%) that a question relates to previous context.
 * Allows user to choose whether to continue previous context or start a new topic.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { ConversationEntities } from "@/lib/services/conversationMemoryService"

interface ContextConfirmationDialogProps {
  open: boolean
  onConfirm: (continueContext: boolean) => void
  detectedContext: {
    entities: ConversationEntities
    confidence: number
    reason: string
  }
  newQuestion: string
}

export function ContextConfirmationDialog({
  open,
  onConfirm,
  detectedContext,
  newQuestion
}: ContextConfirmationDialogProps) {

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '1' || e.key === 'Enter') {
      e.preventDefault()
      onConfirm(true) // Continue context
    } else if (e.key === '2' || e.key === 'Escape') {
      e.preventDefault()
      onConfirm(false) // New topic
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="max-w-2xl"
        onKeyDown={handleKeyDown}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Continue previous topic or start new?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-base">
            <div>
              I detected{' '}
              <Badge
                variant="outline"
                className="font-semibold"
              >
                {(detectedContext.confidence * 100).toFixed(0)}%
              </Badge>{' '}
              confidence that your question relates to previous context.
            </div>

            {/* Show detected entities from previous context */}
            {(detectedContext.entities.teams.length > 0 ||
              detectedContext.entities.pics.length > 0 ||
              detectedContext.entities.products.length > 0 ||
              detectedContext.entities.metrics.length > 0) && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg text-sm">
                <strong className="text-blue-900 dark:text-blue-100">Previous context:</strong>
                <ul className="mt-2 space-y-1 text-xs text-blue-800 dark:text-blue-200">
                  {detectedContext.entities.teams.length > 0 && (
                    <li>
                      <span className="font-medium">Teams:</span>{' '}
                      {detectedContext.entities.teams.join(', ')}
                    </li>
                  )}
                  {detectedContext.entities.pics.length > 0 && (
                    <li>
                      <span className="font-medium">PICs:</span>{' '}
                      {detectedContext.entities.pics.join(', ')}
                    </li>
                  )}
                  {detectedContext.entities.products.length > 0 && (
                    <li>
                      <span className="font-medium">Products:</span>{' '}
                      {detectedContext.entities.products.join(', ')}
                    </li>
                  )}
                  {detectedContext.entities.metrics.length > 0 && (
                    <li>
                      <span className="font-medium">Metrics:</span>{' '}
                      {detectedContext.entities.metrics.join(', ')}
                    </li>
                  )}
                  {detectedContext.entities.timeRanges.length > 0 && (
                    <li>
                      <span className="font-medium">Time:</span>{' '}
                      {detectedContext.entities.timeRanges.join(', ')}
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Show user's new question */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm">
              <strong className="text-gray-900 dark:text-gray-100">Your new question:</strong>
              <p className="mt-1 text-xs italic text-gray-700 dark:text-gray-300">
                &ldquo;{newQuestion}&rdquo;
              </p>
            </div>

            {/* Show AI's reasoning */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {detectedContext.reason}
            </p>

            {/* Keyboard shortcuts hint */}
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
              Tip: Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">1</kbd> or{' '}
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd> to continue context,{' '}
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">2</kbd> or{' '}
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> for new topic
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={() => onConfirm(false)}
            className="sm:w-auto w-full"
          >
            Start New Topic
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(true)}
            className="sm:w-auto w-full"
          >
            Continue Previous Context
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
