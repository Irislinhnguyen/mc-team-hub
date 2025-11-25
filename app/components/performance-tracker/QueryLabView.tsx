'use client'

/**
 * Query Lab - Brand-Aligned Chat Experience
 *
 * Design System:
 * - Primary Blue: #1565C0
 * - Light Accent: #BBDEFB
 * - Hover Blue: #0D47A1
 * - Clean, modern chat bubbles
 * - Minimal visual noise
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/src/components/ui/button'
import { Textarea } from '@/src/components/ui/textarea'
import { Alert, AlertDescription } from '@/src/components/ui/alert'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/src/components/ui/drawer'
import {
  Sparkles, Loader2, AlertCircle, Play, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, PencilLine, RefreshCw, CheckCircle, XCircle,
  PanelLeftClose, PanelLeft, Send, Bot, Maximize2, X, ChevronRight,
  Users, Building, Layers, TrendingUp, Zap
} from 'lucide-react'
import { ScrollArea } from '@/src/components/ui/scroll-area'
import { DataTable } from './DataTable'
import QueryLabSidebar from './QueryLabSidebar'
import { useAuth } from '@/app/contexts/AuthContext'

type RetryAttempt = {
  attempt: number
  sql: string
  error: string
  errorType: string
  fixed: boolean
}

type RetryInfo = {
  totalAttempts: number
  history: RetryAttempt[]
  finalSql: string
  wasRetried?: boolean
  exhausted?: boolean
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  message_type?: 'question' | 'plan' | 'results' | 'error' | 'clarification'
  sql?: string
  results?: any[]
  row_count?: number
  confidence?: number
  warnings?: string[]
  result_title?: string
  retry_info?: RetryInfo
  kg_info?: { concepts: number; patterns: number; rules: number }
  created_at?: string
}

type FeedbackType = 'good' | 'bad' | null

// Creative greetings for welcome screen (without trailing punctuation - user name will be added)
const CREATIVE_GREETINGS = [
  { greeting: "Hey", subtitle: "Ready to uncover insights from your data?" },
  { greeting: "Welcome back", subtitle: "What mysteries shall we solve today?" },
  { greeting: "Hello", subtitle: "Your analytics adventure awaits" },
  { greeting: "Hi", subtitle: "Let's turn your questions into answers" },
  { greeting: "Greetings", subtitle: "Time to make your data talk" },
  { greeting: "What's up", subtitle: "Got questions? I've got queries!" },
  { greeting: "Hey there", subtitle: "Let's dig into some numbers" },
]

// Sample prompts categories for sidebar
// NOTE: AI doesn't know "my team", "me", "this month" - must be SPECIFIC with team names, PIC codes, and dates
const SAMPLE_PROMPTS_CATEGORIES = [
  {
    name: "Team/PIC Analysis",
    icon: "Users",
    prompts: [
      "Total revenue of team WEB_GV in November 2024",
      "Compare revenue of WEB_GV vs APP_GV in October 2024",
      "Top 5 PICs by revenue from 2024-11-01 to 2024-11-25",
      "Revenue breakdown by PIC for team WEB_GTI in Q4 2024",
      "Show revenue of vn_minhlh in last 30 days",
      "Which PIC in WEB_GV had highest revenue growth in November vs October 2024?",
    ]
  },
  {
    name: "Publisher Analysis",
    icon: "Building",
    prompts: [
      "Top 10 publishers by revenue in November 2024",
      "Publishers with revenue drop more than 20% comparing November vs October 2024",
      "All publishers managed by vn_minhlh with revenue in last 7 days",
      "Publishers with fill rate below 50% in November 2024",
      "Revenue of PID 12345 comparing November vs October 2024",
      "Top 5 publishers by profit in Q4 2024",
    ]
  },
  {
    name: "Zone & Product",
    icon: "Layers",
    prompts: [
      "Top 10 zones by revenue from 2024-11-01 to 2024-11-25",
      "Revenue by product for team WEB_GV in November 2024",
      "Compare Overlay vs Sticky revenue in October 2024",
      "Zones with impressions drop more than 30% in November vs October 2024",
      "Revenue trend by product from January to November 2024",
      "Top 5 zones of vn_ducnv by revenue in last 14 days",
    ]
  },
  {
    name: "Time & Trends",
    icon: "TrendingUp",
    prompts: [
      "Compare total revenue November 2024 vs October 2024",
      "Monthly revenue trend from January to November 2024",
      "Daily revenue of WEB_GV from 2024-11-18 to 2024-11-25",
      "Compare Q3 vs Q4 2024 revenue by team",
      "Revenue by day of week in November 2024",
      "Year-over-year comparison: November 2023 vs November 2024",
    ]
  },
  {
    name: "Advanced Analysis",
    icon: "Zap",
    prompts: [
      "Publishers with highest revenue but fill rate below 60% in November 2024",
      "Revenue distribution by product and team in Q4 2024",
      "Products with highest revenue growth comparing November vs October 2024",
      "Average revenue per impression by team in November 2024",
      "Top 10 zones by revenue growth rate November vs October 2024",
      "Publishers of vn_minhlh with revenue drop in last 7 days vs previous 7 days",
    ]
  },
]

interface Session {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
  last_message_at: string
  message_count: number
}

interface GroupedSessions {
  today: Session[]
  yesterday: Session[]
  lastWeek: Session[]
  older: Session[]
}

export default function QueryLabView() {
  // Get user info from auth context
  const { user } = useAuth()
  const displayName = user?.name || user?.email?.split('@')[0] || 'there'

  // Random greeting for welcome screen
  const [greeting] = useState(() =>
    CREATIVE_GREETINGS[Math.floor(Math.random() * CREATIVE_GREETINGS.length)]
  )

  // Sample prompts sidebar state
  const [showPromptsSidebar, setShowPromptsSidebar] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Team/PIC Analysis"])

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [grouped, setGrouped] = useState<GroupedSessions>({
    today: [],
    yesterday: [],
    lastWeek: [],
    older: []
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Current question being processed (FIX for the bug!)
  const [currentQuestion, setCurrentQuestion] = useState('')

  // UI state
  const [input, setInput] = useState('')
  const [currentPlan, setCurrentPlan] = useState('')
  const [currentSql, setCurrentSql] = useState('')
  const [showSql, setShowSql] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [waitingForPlanConfirmation, setWaitingForPlanConfirmation] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackType>(null)
  const [showFeedbackInput, setShowFeedbackInput] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [retryStatus, setRetryStatus] = useState<string | null>(null)
  const [showRetryHistory, setShowRetryHistory] = useState(false)
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  /**
   * Save message to session
   * @param sessionIdOverride - Optional session ID to use instead of state (for new sessions)
   */
  const saveMessage = async (
    message: Omit<Message, 'id' | 'created_at'>,
    sessionIdOverride?: string
  ) => {
    const targetSessionId = sessionIdOverride || sessionId
    if (!targetSessionId) return null

    try {
      const res = await fetch(`/api/query-lab/sessions/${targetSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })

      if (res.ok) {
        const data = await res.json()
        return { message: data.message, newTitle: data.newTitle }
      }
    } catch (err) {
      console.error('Failed to save message:', err)
    }
    return null
  }

  /**
   * Fetch sessions list
   */
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/query-lab/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
        setGrouped(data.grouped || { today: [], yesterday: [], lastWeek: [], older: [] })
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }, [])

  /**
   * Update single session title without refetching all
   */
  const updateSessionTitle = useCallback((id: string, newTitle: string) => {
    console.log('[QueryLab] Updating session title:', id, newTitle)

    // Update in flat sessions array
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, title: newTitle } : s
    ))

    // Update in grouped sessions
    setGrouped(prev => {
      const updateInGroup = (sessions: Session[]) =>
        sessions.map(s => s.id === id ? { ...s, title: newTitle } : s)

      return {
        today: updateInGroup(prev.today),
        yesterday: updateInGroup(prev.yesterday),
        lastWeek: updateInGroup(prev.lastWeek),
        older: updateInGroup(prev.older)
      }
    })
  }, [])

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  /**
   * Create new session
   */
  const createSession = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/query-lab/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (res.ok) {
        const data = await res.json()
        setSessionId(data.session.id)
        return data.session.id
      }
    } catch (err) {
      console.error('Failed to create session:', err)
    }
    return null
  }

  /**
   * Load session with messages
   */
  const loadSession = async (id: string) => {
    try {
      const res = await fetch(`/api/query-lab/sessions/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSessionId(id)
        setMessages(data.messages || [])

        // Find the last user question and plan
        const lastUserMsg = [...(data.messages || [])].reverse().find(m => m.role === 'user')
        const lastPlanMsg = [...(data.messages || [])].reverse().find(m => m.message_type === 'plan')

        if (lastUserMsg) setCurrentQuestion(lastUserMsg.content)
        if (lastPlanMsg) setCurrentPlan(lastPlanMsg.content)

        // Check if waiting for confirmation
        const lastMsg = data.messages?.[data.messages.length - 1]
        if (lastMsg?.message_type === 'plan') {
          setWaitingForPlanConfirmation(true)
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err)
    }
  }

  /**
   * Start new chat
   */
  const handleNewChat = useCallback(() => {
    setSessionId(null)
    setMessages([])
    setCurrentQuestion('')
    setCurrentPlan('')
    setCurrentSql('')
    setInput('')
    setError(null)
    setWaitingForPlanConfirmation(false)
    setShowSql(false)
    setFeedback(null)
    setShowFeedbackInput(false)
    setFeedbackText('')
    setRetryStatus(null)
    setShowRetryHistory(false)
    fetchSessions()  // Refresh session list
  }, [fetchSessions])

  /**
   * Handle selecting a session from sidebar
   */
  const handleSelectSession = useCallback((id: string) => {
    if (id === sessionId) return
    loadSession(id)
  }, [sessionId])

  /**
   * Build conversation history for context
   */
  const getConversationHistory = (): string => {
    return messages.map(m => {
      if (m.role === 'user') return `User: ${m.content}`
      if (m.message_type === 'plan') return `AI Plan: ${m.content}`
      if (m.message_type === 'results') return `Results: ${m.row_count} rows returned`
      return `AI: ${m.content}`
    }).join('\n')
  }

  /**
   * Handle submit - new question or feedback
   * @param promptOverride - Optional prompt to use instead of input state (for sample prompts)
   * @param forceNewSession - If true, forces creation of a new session
   */
  const handleSubmit = async (promptOverride?: string, forceNewSession?: boolean) => {
    const questionText = (promptOverride || input).trim()
    if (!questionText) return

    // Clear input only if not using promptOverride
    if (!promptOverride) setInput('')
    setIsLoading(true)
    setError(null)

    // Force new session if requested (e.g., from sample prompts)
    if (forceNewSession) {
      setSessionId(null)
      setMessages([])
    }

    // Create session if needed
    let activeSessionId = forceNewSession ? null : sessionId
    if (!activeSessionId) {
      activeSessionId = await createSession()
      if (!activeSessionId) {
        setError('Failed to create session')
        setIsLoading(false)
        return
      }
      // Refresh sidebar to show new session immediately
      fetchSessions()
    }

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: questionText,
      message_type: 'question'
    }
    setMessages(prev => [...prev, userMessage])

    // IMPORTANT: Track this as the current question
    setCurrentQuestion(questionText)

    try {
      // Save user message to DB (pass activeSessionId for new sessions)
      const savedUserMessage = await saveMessage({
        role: 'user',
        content: questionText,
        message_type: 'question'
      }, activeSessionId)

      // Determine if this is a new question or refinement
      const isFirstMessage = messages.length === 0
      const action = isFirstMessage ? 'generate' : 'update'

      const response = await fetch('/api/performance-tracker/query-lab/simple-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          question: questionText, // Always use the NEW question
          plan: isFirstMessage ? undefined : currentPlan,
          feedback: isFirstMessage ? undefined : questionText,
          conversationHistory: getConversationHistory()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate plan')
      }

      const result = await response.json()
      setCurrentPlan(result.plan)

      // Add AI plan message
      const aiMessage: Message = {
        id: `temp-${Date.now() + 1}`,
        role: 'assistant',
        content: result.plan,
        message_type: 'plan'
      }
      setMessages(prev => [...prev, aiMessage])

      // Save AI message to DB
      await saveMessage({
        role: 'assistant',
        content: result.plan,
        message_type: 'plan'
      }, activeSessionId)

      setWaitingForPlanConfirmation(true)

      // Update session title in sidebar (no remount needed)
      // Use activeSessionId instead of sessionId (which may be null for new sessions)
      if (savedUserMessage?.newTitle && activeSessionId) {
        console.log('[QueryLab] Session renamed to (fallback):', savedUserMessage.newTitle)
        updateSessionTitle(activeSessionId, savedUserMessage.newTitle)

        // Poll for AI title update (background generation takes 1-2 seconds)
        const fallbackTitle = savedUserMessage.newTitle
        const targetSessionId = activeSessionId  // Capture for closure
        let pollCount = 0
        const pollInterval = setInterval(async () => {
          pollCount++
          if (pollCount > 10) {  // Stop after 5 seconds (10 x 500ms)
            clearInterval(pollInterval)
            return
          }

          try {
            const res = await fetch(`/api/query-lab/sessions/${targetSessionId}`)
            if (res.ok) {
              const data = await res.json()
              if (data.session?.title && data.session.title !== fallbackTitle) {
                // AI title is different from fallback, update!
                console.log('[QueryLab] AI title updated:', data.session.title)
                updateSessionTitle(targetSessionId, data.session.title)
                clearInterval(pollInterval)
              }
            }
          } catch (error) {
            // Ignore polling errors
          }
        }, 500)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Execute the plan
   */
  const handleExecute = async () => {
    setIsLoading(true)
    setError(null)
    setRetryStatus(null)
    setWaitingForPlanConfirmation(false)

    // Use currentQuestion - the question that generated this plan
    const questionToExecute = currentQuestion

    try {
      // Step 1: Generate SQL
      setRetryStatus('Generating SQL...')
      const sqlResponse = await fetch('/api/performance-tracker/query-lab/simple-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-sql',
          question: questionToExecute,
          plan: currentPlan,
          conversationHistory: getConversationHistory()
        })
      })

      if (!sqlResponse.ok) {
        const errorData = await sqlResponse.json()
        throw new Error(errorData.error || 'Failed to generate SQL')
      }

      const sqlResult = await sqlResponse.json()
      setCurrentSql(sqlResult.sql)

      // Step 2: Execute with automatic retry
      setRetryStatus('Executing query...')
      const execResponse = await fetch('/api/performance-tracker/query-lab/simple-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute-with-retry',
          question: questionToExecute,
          plan: currentPlan,
          sql: sqlResult.sql
        })
      })

      const execResult = await execResponse.json()

      if (execResponse.ok && execResult.status === 'success') {
        const retryInfo = execResult.retryInfo as RetryInfo | undefined

        if (retryInfo?.finalSql && retryInfo.finalSql !== sqlResult.sql) {
          setCurrentSql(retryInfo.finalSql)
        }

        // Create results message
        const resultsMessage: Message = {
          id: `temp-${Date.now() + 2}`,
          role: 'assistant',
          content: retryInfo?.wasRetried
            ? `Query executed successfully after ${retryInfo.totalAttempts} attempts`
            : 'Query executed successfully',
          message_type: 'results',
          sql: retryInfo?.finalSql || sqlResult.sql,
          results: execResult.results,
          row_count: execResult.rowCount,
          confidence: sqlResult.confidence,
          warnings: sqlResult.warnings,
          result_title: sqlResult.resultTitle,
          retry_info: retryInfo,
          kg_info: sqlResult.kgInfo
        }
        setMessages(prev => [...prev, resultsMessage])

        // Save results to DB
        await saveMessage({
          role: 'assistant',
          content: resultsMessage.content,
          message_type: 'results',
          sql: resultsMessage.sql,
          results: execResult.results,
          row_count: execResult.rowCount,
          confidence: sqlResult.confidence,
          warnings: sqlResult.warnings,
          result_title: sqlResult.resultTitle,
          retry_info: retryInfo,
          kg_info: sqlResult.kgInfo
        })

        setFeedback(null)
        setShowFeedbackInput(false)
        setRetryStatus(null)
        // No need to refresh sidebar - session already exists
        return
      }

      // Error handling - get clarification
      console.log('[QueryLab] Execute failed:', execResult.error)
      const retryInfo = execResult.retryInfo as RetryInfo | undefined

      const fixResponse = await fetch('/api/performance-tracker/query-lab/simple-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto-fix-error',
          question: questionToExecute,
          sql: retryInfo?.finalSql || sqlResult.sql,
          errorMessage: execResult.error
        })
      })

      if (fixResponse.ok) {
        const fixResult = await fixResponse.json()
        if (fixResult.clarifyingQuestion) {
          const clarificationMessage: Message = {
            id: `temp-${Date.now() + 3}`,
            role: 'assistant',
            content: fixResult.clarifyingQuestion,
            message_type: 'clarification'
          }
          setMessages(prev => [...prev, clarificationMessage])
          await saveMessage({
            role: 'assistant',
            content: fixResult.clarifyingQuestion,
            message_type: 'clarification'
          })
          setWaitingForPlanConfirmation(true)
          setRetryStatus(null)
          return
        }
      }

      // Fallback
      const fallbackMessage: Message = {
        id: `temp-${Date.now() + 4}`,
        role: 'assistant',
        content: 'I had trouble processing this request. Could you rephrase your question?',
        message_type: 'clarification'
      }
      setMessages(prev => [...prev, fallbackMessage])
      setWaitingForPlanConfirmation(true)

    } catch (err) {
      console.error('[QueryLab] Error:', err)
      const helpMessage: Message = {
        id: `temp-${Date.now() + 5}`,
        role: 'assistant',
        content: 'An error occurred. Please try again or rephrase your question.',
        message_type: 'error'
      }
      setMessages(prev => [...prev, helpMessage])
      setWaitingForPlanConfirmation(true)
    } finally {
      setIsLoading(false)
      setRetryStatus(null)
    }
  }

  /**
   * Handle feedback
   */
  const handleFeedback = async (type: 'good' | 'bad') => {
    setFeedback(type)

    if (type === 'bad') {
      setShowFeedbackInput(true)
      return
    }

    try {
      await fetch('/api/performance-tracker/query-lab/simple-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store-feedback',
          question: currentQuestion,
          sql: currentSql,
          feedback: 'positive'
        })
      })
    } catch (err) {
      console.error('Failed to store feedback:', err)
    }
  }

  /**
   * Submit negative feedback
   */
  const handleSubmitNegativeFeedback = async () => {
    if (!feedbackText.trim()) return

    setIsSubmittingFeedback(true)
    try {
      await fetch('/api/performance-tracker/query-lab/simple-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store-feedback',
          question: currentQuestion,
          sql: currentSql,
          feedback: 'negative',
          feedbackText
        })
      })
      setShowFeedbackInput(false)
      setFeedbackText('')
    } catch (err) {
      console.error('Failed to store feedback:', err)
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  /**
   * Handle adjust
   */
  const handleAdjust = () => {
    setInput('Adjust: ')
    setWaitingForPlanConfirmation(false)
    setFeedback(null)
    setShowFeedbackInput(false)
  }

  const latestResults = messages.filter(m => m.message_type === 'results').pop()
  const isInChatMode = messages.length > 0

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <QueryLabSidebar
        currentSessionId={sessionId}
        sessions={sessions}
        grouped={grouped}
        onUpdateTitle={updateSessionTitle}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header - Minimal */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="md:hidden text-gray-500 hover:text-[#1565C0]"
            >
              {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            {isInChatMode && (
              <h2 className="text-sm font-medium text-gray-600">
                Ask follow-up questions to refine your query
              </h2>
            )}
          </div>
          {isInChatMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="text-[#1565C0] hover:bg-[#BBDEFB]/30"
            >
              + New Chat
            </Button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Empty State */}
          {!isInChatMode && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">{greeting.greeting}, {displayName}!</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {greeting.subtitle}
              </p>

              {/* Quick Guide */}
              <div className="mt-6 max-w-md text-left bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Guide</h4>
                <ul className="text-xs text-gray-600 space-y-2">
                  <li className="flex gap-2">
                    <span className="text-[#1565C0]">•</span>
                    <span>Use exact team names: <code className="bg-gray-200 px-1.5 py-0.5 rounded text-[#1565C0] font-mono">WEB_GV</code>, <code className="bg-gray-200 px-1.5 py-0.5 rounded text-[#1565C0] font-mono">WEB_GTI</code>, <code className="bg-gray-200 px-1.5 py-0.5 rounded text-[#1565C0] font-mono">APP_GV</code></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#1565C0]">•</span>
                    <span>Use Aladin PIC codes: <code className="bg-gray-200 px-1.5 py-0.5 rounded text-[#1565C0] font-mono">vn_minhlh</code>, <code className="bg-gray-200 px-1.5 py-0.5 rounded text-[#1565C0] font-mono">vn_ducnv</code></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#1565C0]">•</span>
                    <span>Specify time range: "last 7 days", "this month", "2024-01"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#1565C0]">•</span>
                    <span>Be specific with metrics: revenue, impressions, fill_rate, rpm</span>
                  </li>
                </ul>
              </div>

              {/* Sample Prompts Link */}
              <button
                onClick={() => setShowPromptsSidebar(true)}
                className="mt-4 text-sm text-[#1565C0] hover:text-[#0D47A1] hover:underline transition-colors"
              >
                View sample prompts →
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-6 max-w-4xl mx-auto">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-[#1565C0] text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[75%] shadow-sm">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ) : msg.message_type === 'plan' || msg.message_type === 'clarification' ? (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#BBDEFB] flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-[#1565C0]" />
                  </div>
                  <div className="flex-1 max-w-[85%]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-[#1565C0] uppercase tracking-wide">
                        {msg.message_type === 'plan' ? 'Analysis Plan' : 'Question'}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-5 py-3 text-sm whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ) : msg.message_type === 'results' ? (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#BBDEFB] flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-[#1565C0]" />
                  </div>
                  <div className="flex-1 space-y-3">
                  {/* Results Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#1565C0]">
                        {msg.result_title || 'Query Results'}
                      </h3>
                      <span className="text-sm text-gray-500">
                        ({msg.row_count} rows)
                      </span>
                      {msg.kg_info && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#BBDEFB] text-[#1565C0] font-medium">
                          KG Enhanced
                        </span>
                      )}
                      {msg.retry_info?.wasRetried && (
                        <button
                          onClick={() => setShowRetryHistory(!showRetryHistory)}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center gap-1 font-medium"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Auto-fixed
                        </button>
                      )}
                    </div>
                    {msg.sql && (
                      <button
                        onClick={() => setShowSql(!showSql)}
                        className="text-xs text-[#1565C0] hover:text-[#0D47A1] flex items-center gap-1 font-medium"
                      >
                        {showSql ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {showSql ? 'Hide SQL' : 'View SQL'}
                      </button>
                    )}
                  </div>

                  {/* Retry History */}
                  {showRetryHistory && msg.retry_info?.history?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                      <div className="flex items-center gap-2 mb-2 font-medium text-amber-700 text-xs">
                        <RefreshCw className="h-3 w-3" />
                        Auto-Retry History
                      </div>
                      <div className="space-y-1.5">
                        {msg.retry_info.history.map((attempt, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <span className={`mt-0.5 ${attempt.fixed ? 'text-green-600' : 'text-red-500'}`}>
                              {attempt.fixed ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            </span>
                            <div className="flex-1 text-gray-600">
                              <span className="font-medium">Attempt {attempt.attempt}:</span>
                              <span className="ml-1">
                                {attempt.errorType} {attempt.fixed && '→ Fixed'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {msg.warnings?.length > 0 && (
                    <Alert className="bg-amber-50 border-amber-200 rounded-xl">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700 text-sm">
                        {msg.warnings.map((w, i) => <div key={i}>{w}</div>)}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* SQL */}
                  {showSql && msg.sql && (
                    <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                      <pre className="leading-relaxed">{msg.sql}</pre>
                    </div>
                  )}

                  {/* Results Table - Compact Preview */}
                  {msg.results?.length > 0 && (
                    <div className="max-w-2xl">
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                        {/* Preview: First 5 rows */}
                        <div className="overflow-auto max-h-[220px]">
                          <DataTable
                            data={msg.results.slice(0, 5)}
                            columns={Object.keys(msg.results[0]).map(key => ({
                              key,
                              label: key,
                              type: typeof msg.results![0][key] === 'number' ? 'number' : 'string'
                            }))}
                          />
                        </div>

                        {/* Expand Button */}
                        {msg.results.length > 5 && (
                          <button
                            onClick={() => setExpandedTableId(msg.id)}
                            className="w-full py-2.5 bg-gray-50 text-sm text-[#1565C0] hover:bg-[#BBDEFB]/30 flex items-center justify-center gap-2 border-t border-gray-100 transition-colors"
                          >
                            <Maximize2 className="h-4 w-4" />
                            View Full Table ({msg.row_count} rows)
                          </button>
                        )}
                      </div>

                      {/* Full Screen Drawer */}
                      <Drawer open={expandedTableId === msg.id} onOpenChange={(open) => !open && setExpandedTableId(null)}>
                        <DrawerContent className="h-[90vh] max-h-[90vh]">
                          <DrawerHeader className="border-b border-gray-100 flex items-center justify-between">
                            <DrawerTitle className="text-[#1565C0]">
                              {msg.result_title || 'Query Results'} ({msg.row_count} rows)
                            </DrawerTitle>
                            <DrawerClose asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                                <X className="h-4 w-4" />
                              </Button>
                            </DrawerClose>
                          </DrawerHeader>
                          <div className="flex-1 overflow-auto p-4">
                            <DataTable
                              data={msg.results}
                              columns={Object.keys(msg.results[0]).map(key => ({
                                key,
                                label: key,
                                type: typeof msg.results![0][key] === 'number' ? 'number' : 'string'
                              }))}
                            />
                          </div>
                        </DrawerContent>
                      </Drawer>
                    </div>
                  )}
                </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#BBDEFB] flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-[#1565C0]" />
                  </div>
                  <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-5 py-3 max-w-[80%]">
                    <p className="text-sm text-gray-700 leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-[#BBDEFB] flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-4 w-4 animate-spin text-[#1565C0]" />
              </div>
              <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-5 py-3">
                <p className="text-sm text-gray-500">{retryStatus || 'Thinking...'}</p>
              </div>
            </div>
          )}

          {/* Execute/Adjust Buttons */}
          {waitingForPlanConfirmation && !isLoading && (
            <div className="flex gap-3 max-w-sm ml-11">
              <Button
                onClick={handleExecute}
                className="flex-1 bg-[#1565C0] hover:bg-[#0D47A1] text-white shadow-sm"
              >
                <Play className="mr-2 h-4 w-4" />
                Execute Query
              </Button>
              <Button
                onClick={() => setWaitingForPlanConfirmation(false)}
                variant="outline"
                className="flex-1 border-[#1565C0]/30 text-[#1565C0] hover:bg-[#BBDEFB]/30"
              >
                Adjust
              </Button>
            </div>
          )}

          {/* Feedback Panel */}
          {latestResults && !waitingForPlanConfirmation && (
            <div className="pt-2 ml-11">
              {!feedback && !showFeedbackInput && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-400">Was this helpful?</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback('good')}
                      className="h-7 w-7 p-0 rounded-full hover:bg-green-50 hover:text-green-600"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFeedback('bad')}
                      className="h-7 w-7 p-0 rounded-full hover:bg-red-50 hover:text-red-600"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAdjust}
                      className="h-7 px-2 text-xs rounded-full hover:bg-[#BBDEFB]/30 hover:text-[#1565C0]"
                    >
                      <PencilLine className="h-3 w-3 mr-1" />
                      Adjust
                    </Button>
                  </div>
                </div>
              )}

              {feedback === 'good' && (
                <div className="flex items-center gap-2 text-green-600 text-xs">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>Thanks! This helps AI learn.</span>
                </div>
              )}

              {showFeedbackInput && (
                <div className="space-y-2 max-w-md">
                  <p className="text-xs text-gray-500">What was wrong?</p>
                  <Textarea
                    placeholder="e.g., 'I wanted revenue by month, not by product'"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={2}
                    className="resize-none text-sm rounded-xl border-gray-200 focus:border-[#1565C0] focus:ring-[#1565C0]"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSubmitNegativeFeedback}
                      disabled={isSubmittingFeedback || !feedbackText.trim()}
                      className="bg-[#1565C0] hover:bg-[#0D47A1] text-white text-xs"
                    >
                      {isSubmittingFeedback && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Submit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowFeedbackInput(false); setFeedback(null); setFeedbackText('') }}
                      className="text-xs text-gray-500"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-100 bg-gray-50/50 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 focus-within:border-[#1565C0] focus-within:ring-2 focus-within:ring-[#1565C0]/20 transition-all">
              <Textarea
                placeholder={messages.length === 0
                  ? "Ask a question about your data..."
                  : "Ask a follow-up question..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (waitingForPlanConfirmation && !input.trim()) {
                      handleExecute()
                    } else if (input.trim()) {
                      handleSubmit()
                    }
                  }
                }}
                className="resize-none border-0 bg-transparent px-4 py-3 pr-14 focus:ring-0 focus-visible:ring-0 text-sm"
                rows={2}
                disabled={isLoading}
              />
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                size="sm"
                className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full bg-[#1565C0] hover:bg-[#0D47A1] disabled:bg-gray-200 disabled:text-gray-400"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Press Enter to send {waitingForPlanConfirmation && '• Empty Enter to execute query'}
            </p>
          </div>
        </div>
      </div>

      {/* Sample Prompts Right Sidebar */}
      {showPromptsSidebar && (
        <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col shadow-lg">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Sample Prompts</h3>
            <button
              onClick={() => setShowPromptsSidebar(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Note */}
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
            <p className="text-[11px] text-amber-700">
              <strong>Note:</strong> Use specific team names, PIC codes, and dates
            </p>
          </div>

          {/* Categories */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {SAMPLE_PROMPTS_CATEGORIES.map((category) => {
                const isExpanded = expandedCategories.includes(category.name)
                const IconComponent = category.icon === 'Users' ? Users
                  : category.icon === 'Building' ? Building
                  : category.icon === 'Layers' ? Layers
                  : category.icon === 'TrendingUp' ? TrendingUp
                  : Zap

                return (
                  <div key={category.name} className="rounded-lg border border-gray-100 overflow-hidden">
                    {/* Category Header */}
                    <button
                      onClick={() => {
                        setExpandedCategories(prev =>
                          isExpanded
                            ? prev.filter(c => c !== category.name)
                            : [...prev, category.name]
                        )
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <IconComponent className="h-4 w-4 text-[#1565C0]" />
                      <span className="flex-1 text-left text-sm font-medium text-gray-700">
                        {category.name}
                      </span>
                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Prompts List */}
                    {isExpanded && (
                      <div className="py-1">
                        {category.prompts.map((prompt, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setShowPromptsSidebar(false)
                              // Auto-submit with new session
                              handleSubmit(prompt, true)
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:text-[#1565C0] hover:bg-[#BBDEFB]/20 transition-colors leading-relaxed"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-500 text-center">
              Click any prompt to use it
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
