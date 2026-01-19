/**
 * Conversation Memory Service
 *
 * Manages conversation context for SQL generation optimization.
 * Key features:
 * - Track conversation history within a session
 * - Detect follow-up questions vs new topics
 * - Enable SQL refinement instead of full regeneration
 *
 * Cost savings: ~99% for follow-up questions using gpt-4o-mini
 */

import { createAdminClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { OpenAIUsageTracker, UserContext } from './openaiUsageTracker'

// ============================================================================
// Types
// ============================================================================

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sql?: string | null
  results?: any | null
  created_at: string
}

export interface ConversationContext {
  sessionId: string
  messages: ConversationMessage[]
  lastSqlMessage: ConversationMessage | null
  hasContext: boolean
}

export type QuestionType = 'follow_up' | 'new_topic'

export interface QuestionTypeResult {
  type: QuestionType
  confidence: number
  reason: string
}

// ============================================================================
// Constants
// ============================================================================

// Keywords suggesting follow-up/modification intent
const MODIFY_KEYWORDS_VI = [
  'thay', 'đổi', 'sửa', 'chỉnh', 'cập nhật', 'update',
  'nhưng', 'thêm', 'bỏ', 'xóa', 'giữ', 'lọc thêm',
  'chỉ lấy', 'chỉ hiển thị', 'bớt', 'thay bằng'
]

const MODIFY_KEYWORDS_EN = [
  'change', 'modify', 'update', 'but', 'however',
  'add', 'remove', 'delete', 'keep', 'filter',
  'only show', 'instead', 'replace', 'switch',
  'adjust:', 'show zone name', 'add zone', 'add column', 'include zone'
]

// Reference words pointing to previous context
const REFERENCE_WORDS_VI = [
  'cái đó', 'nó', 'kết quả', 'data', 'bảng', 'query',
  'ở trên', 'vừa rồi', 'như trên', 'cái này'
]

const REFERENCE_WORDS_EN = [
  'that', 'it', 'result', 'data', 'table', 'query',
  'above', 'previous', 'this', 'same'
]

// Time-related modification patterns (common follow-ups)
const TIME_MODIFY_PATTERNS = [
  /tháng\s*\d+/i,           // tháng 10, tháng 11
  /\d{4}/,                   // năm 2024, 2025
  /q[1-4]/i,                 // Q1, Q2, Q3, Q4
  /quarter/i,
  /january|february|march|april|may|june|july|august|september|october|november|december/i,
  /jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec/i
]

// ============================================================================
// Conversation Memory Service
// ============================================================================

class ConversationMemoryService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  /**
   * Get recent conversation context for a session
   */
  async getConversationContext(sessionId: string, limit: number = 5): Promise<ConversationContext> {
    try {
      const supabase = await createAdminClient()

      const { data: messages, error } = await supabase
        .from('query_lab_messages')
        .select('id, role, content, sql, results, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('[ConversationMemory] Error fetching messages:', error)
        return {
          sessionId,
          messages: [],
          lastSqlMessage: null,
          hasContext: false
        }
      }

      // Reverse to get chronological order
      const orderedMessages = (messages || []).reverse() as ConversationMessage[]

      // Find the most recent message with SQL
      const lastSqlMessage = orderedMessages
        .slice()
        .reverse()
        .find(m => m.sql && m.sql.trim().length > 0) || null

      return {
        sessionId,
        messages: orderedMessages,
        lastSqlMessage,
        hasContext: orderedMessages.length > 0
      }
    } catch (error) {
      console.error('[ConversationMemory] Error:', error)
      return {
        sessionId,
        messages: [],
        lastSqlMessage: null,
        hasContext: false
      }
    }
  }

  /**
   * Detect if question is a follow-up or new topic
   * Uses rule-based detection first, then AI if uncertain
   */
  async detectQuestionType(
    question: string,
    context: ConversationContext,
    user?: UserContext
  ): Promise<QuestionTypeResult> {
    // No context = definitely new topic
    if (!context.hasContext || !context.lastSqlMessage) {
      return {
        type: 'new_topic',
        confidence: 1.0,
        reason: 'No previous context in session'
      }
    }

    const questionLower = question.toLowerCase()

    // Rule 1: Check for modification keywords
    const hasModifyKeyword = [
      ...MODIFY_KEYWORDS_VI,
      ...MODIFY_KEYWORDS_EN
    ].some(keyword => questionLower.includes(keyword.toLowerCase()))

    if (hasModifyKeyword) {
      return {
        type: 'follow_up',
        confidence: 0.9,
        reason: 'Contains modification keywords'
      }
    }

    // Rule 2: Check for reference words
    const hasReference = [
      ...REFERENCE_WORDS_VI,
      ...REFERENCE_WORDS_EN
    ].some(word => questionLower.includes(word.toLowerCase()))

    if (hasReference) {
      return {
        type: 'follow_up',
        confidence: 0.85,
        reason: 'Contains reference to previous context'
      }
    }

    // Rule 3: Check for time-related modifications
    // If question is short and contains time patterns, likely modifying date range
    const isShortQuestion = question.length < 100
    const hasTimePattern = TIME_MODIFY_PATTERNS.some(pattern => pattern.test(question))

    if (isShortQuestion && hasTimePattern) {
      return {
        type: 'follow_up',
        confidence: 0.8,
        reason: 'Short question with time modification pattern'
      }
    }

    // Rule 4: Very short question likely refers to previous
    if (question.length < 50) {
      return {
        type: 'follow_up',
        confidence: 0.7,
        reason: 'Very short question, likely refers to previous context'
      }
    }

    // If rules are inconclusive, use lightweight AI check
    // But only if confidence is needed (for expensive decisions)
    // For now, default to follow_up if there's recent SQL context
    if (context.lastSqlMessage) {
      // Check if the new question seems related to previous topic
      const prevQuestion = context.messages
        .filter(m => m.role === 'user')
        .slice(-1)[0]?.content || ''

      const hasOverlap = this.hasKeywordOverlap(question, prevQuestion)

      if (hasOverlap) {
        return {
          type: 'follow_up',
          confidence: 0.75,
          reason: 'Has keyword overlap with previous question'
        }
      }
    }

    // Default to new_topic for distinctly different questions
    return {
      type: 'new_topic',
      confidence: 0.6,
      reason: 'No clear follow-up indicators detected'
    }
  }

  /**
   * Refine SQL based on previous SQL and new question
   * Uses gpt-4.1-mini with full system context for accuracy
   */
  async refineSqlFromContext(
    newQuestion: string,
    previousQuestion: string,
    previousSql: string,
    user?: UserContext
  ): Promise<{
    sql: string
    changes: string[]
    model: string
  }> {
    const tracker = user
      ? new OpenAIUsageTracker(user, 'sql_refinement', '/api/query-lab/refine-sql')
      : null

    try {
      // Import the full system prompt for comprehensive context
      const { SYSTEM_PROMPT } = await import('../../../../lib/services/aiSqlGenerator')

      // Extract schema and rules (everything before YOUR TASK section)
      const promptParts = SYSTEM_PROMPT?.split('YOUR TASK:') || []
      const schemaContext = promptParts[0] || ''

      const prompt = `You are a BigQuery SQL expert refining an existing query.

**PREVIOUS QUESTION:** "${previousQuestion}"

**WORKING SQL:**
\`\`\`sql
${previousSql}
\`\`\`

**NEW REQUEST:** "${newQuestion}"

**SCHEMA AND RULES:**
${schemaContext}

**REFINEMENT INSTRUCTIONS:**
- Modify the SQL to fulfill the new request
- Make minimal changes - only update what's necessary
- Keep the same table references and structure if possible
- Preserve working logic that doesn't need to change
- When adding new metrics, use the formulas specified above

**RESPONSE FORMAT (JSON):**
{
  "sql": "SELECT ... (the modified SQL)",
  "changes": ["Description of change 1", "Description of change 2"]
}

Respond with valid JSON only.`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a BigQuery SQL expert. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })

      // Log usage
      if (tracker) {
        await tracker.logUsage(response, `Refine: ${newQuestion.substring(0, 100)}`)
      }

      const result = JSON.parse(response.choices[0].message.content || '{}')

      if (!result.sql) {
        throw new Error('No SQL in refinement response')
      }

      console.log(`[ConversationMemory] Refined SQL with ${result.changes?.length || 0} changes using gpt-4.1-mini`)

      return {
        sql: result.sql,
        changes: result.changes || [],
        model: 'gpt-4.1-mini'
      }

    } catch (error) {
      // Log error
      if (tracker) {
        await tracker.logError(error, 'gpt-4o-mini', newQuestion)
      }

      console.error('[ConversationMemory] Refinement error:', error)
      throw error
    }
  }

  /**
   * Check if two questions share significant keywords
   * Simple overlap check without AI
   */
  private hasKeywordOverlap(question1: string, question2: string): boolean {
    const extractWords = (text: string): Set<string> => {
      const words = text
        .toLowerCase()
        .replace(/[^\w\sàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)

      // Remove common words
      const stopWords = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
        'có', 'là', 'của', 'và', 'trong', 'cho', 'với', 'được', 'này', 'đó',
        'show', 'find', 'get', 'list', 'display', 'tìm', 'hiển', 'thị', 'lấy'
      ])

      return new Set(words.filter(w => !stopWords.has(w)))
    }

    const words1 = extractWords(question1)
    const words2 = extractWords(question2)

    if (words1.size === 0 || words2.size === 0) return false

    // Calculate Jaccard similarity
    const intersection = [...words1].filter(w => words2.has(w)).length
    const union = new Set([...words1, ...words2]).size

    const similarity = intersection / union
    return similarity > 0.2 // At least 20% overlap
  }

  /**
   * Build a conversation summary for context
   * Used when passing context to full generation
   */
  buildConversationSummary(context: ConversationContext): string {
    if (!context.hasContext || context.messages.length === 0) {
      return ''
    }

    const summaryParts: string[] = ['**PREVIOUS CONVERSATION:**']

    // Get last 3 exchanges
    const recentExchanges = context.messages.slice(-6)

    for (const msg of recentExchanges) {
      const role = msg.role === 'user' ? 'User' : 'Assistant'
      const content = msg.content.length > 200
        ? msg.content.substring(0, 200) + '...'
        : msg.content

      summaryParts.push(`${role}: ${content}`)

      if (msg.sql) {
        summaryParts.push(`[SQL was generated]`)
      }
    }

    return summaryParts.join('\n')
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const conversationMemory = new ConversationMemoryService()
export default conversationMemory
