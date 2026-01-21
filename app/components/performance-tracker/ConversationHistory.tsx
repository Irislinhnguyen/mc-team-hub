'use client'

/**
 * ConversationHistory Component
 *
 * Displays the feedback exchange history between user and AI
 * Shows how reasoning was refined through conversations
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import type { ConversationHistory as ConversationHistoryType } from '../../../lib/types/reasoning'

interface ConversationHistoryProps {
  history: ConversationHistoryType
}

export default function ConversationHistory({ history }: ConversationHistoryProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  if (!history || !history.exchanges || history.exchanges.length === 0) {
    return null
  }

  const stepNames = {
    1: 'Understanding',
    2: 'Logic Breakdown',
    3: 'Constraints',
    4: 'SQL Plan'
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">
                Conversation History ({history.exchanges.length} {history.exchanges.length === 1 ? 'exchange' : 'exchanges'})
              </CardTitle>
              <Badge variant="outline">{history.totalIterations} iterations</Badge>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {history.exchanges.map((exchange, idx) => (
              <div
                key={exchange.id}
                className="border-l-4 border-blue-500 pl-4 py-2 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">
                    Exchange {idx + 1}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Step {exchange.stepNumber}: {stepNames[exchange.stepNumber as keyof typeof stepNames]}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {new Date(exchange.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* User Feedback */}
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    👤 Your Feedback:
                  </p>
                  <p className="text-sm">{exchange.userFeedback}</p>
                </div>

                {/* AI Response */}
                <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    🤖 AI Response:
                  </p>
                  <p className="text-sm">{exchange.aiResponse}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
