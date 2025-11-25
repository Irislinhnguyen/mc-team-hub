/**
 * Feedback Learning Service
 *
 * ML-style learning loop using Supabase:
 * 1. Store feedback from users
 * 2. Detect error patterns
 * 3. Auto-generate rules when patterns repeat
 * 4. Apply learned rules to fix SQL before execution
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Threshold for auto-creating rules
const AUTO_RULE_THRESHOLD = 3

export interface LearnedRule {
  id: string
  rule_type: 'column_fix' | 'pattern_fix' | 'prompt_hint'
  pattern: string
  correction: string
  description?: string
  occurrences: number
  is_active: boolean
}

export interface FeedbackInput {
  question: string
  sql?: string
  feedbackType: 'positive' | 'negative' | 'error'
  feedbackText?: string
  errorMessage?: string
  userId?: string
}

class FeedbackLearningService {
  private rulesCache: LearnedRule[] = []
  private rulesCacheTime: number = 0
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Generate error signature for grouping similar errors
   */
  private generateErrorSignature(errorMessage: string, errorType: string = 'unknown'): string {
    const normalized = errorMessage
      .substring(0, 100)
      .replace(/[^a-zA-Z0-9\s]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase()

    return `${errorType}_${normalized}`
  }

  /**
   * Extract error type from message
   */
  private detectErrorType(errorMessage: string): string {
    const lower = errorMessage.toLowerCase()
    if (lower.includes('column') || lower.includes('field')) return 'column'
    if (lower.includes('syntax')) return 'syntax'
    if (lower.includes('table') || lower.includes('not found')) return 'table'
    return 'semantic'
  }

  /**
   * Store feedback and trigger learning
   */
  async storeFeedback(input: FeedbackInput): Promise<void> {
    try {
      const errorSignature = input.errorMessage
        ? this.generateErrorSignature(input.errorMessage, this.detectErrorType(input.errorMessage))
        : null

      // Store the feedback
      const { error: insertError } = await supabase
        .from('query_feedback')
        .insert({
          question: input.question,
          sql_generated: input.sql,
          feedback_type: input.feedbackType,
          feedback_text: input.feedbackText,
          error_message: input.errorMessage,
          error_signature: errorSignature,
          user_id: input.userId
        })

      if (insertError) {
        console.warn('[FeedbackLearning] Failed to store feedback:', insertError.message)
        return
      }

      // If it's an error, update error patterns
      if (input.feedbackType === 'error' && errorSignature) {
        await this.updateErrorPattern(
          errorSignature,
          this.detectErrorType(input.errorMessage!),
          input.errorMessage!,
          input.question,
          input.sql
        )
      }

      console.log(`[FeedbackLearning] Stored ${input.feedbackType} feedback`)
    } catch (error) {
      console.warn('[FeedbackLearning] Error storing feedback:', error)
    }
  }

  /**
   * Update error pattern count and check for auto-rule creation
   */
  private async updateErrorPattern(
    signature: string,
    errorType: string,
    message: string,
    question: string,
    sql?: string
  ): Promise<void> {
    try {
      // Upsert error pattern
      const { data: existing } = await supabase
        .from('error_patterns')
        .select('occurrences')
        .eq('error_signature', signature)
        .single()

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('error_patterns')
          .update({
            occurrences: existing.occurrences + 1,
            last_seen: new Date().toISOString(),
            example_message: message,
            example_question: question,
            example_sql: sql
          })
          .eq('error_signature', signature)

        if (!error) {
          console.log(`[FeedbackLearning] Error pattern "${signature.substring(0, 30)}...": ${existing.occurrences + 1} occurrences`)

          // Check if we should suggest a rule
          if (existing.occurrences + 1 >= AUTO_RULE_THRESHOLD) {
            await this.suggestRuleFromPattern(signature, errorType, message, sql)
          }
        }
      } else {
        // Insert new
        await supabase
          .from('error_patterns')
          .insert({
            error_signature: signature,
            error_type: errorType,
            example_message: message,
            example_question: question,
            example_sql: sql,
            occurrences: 1
          })
      }
    } catch (error) {
      console.warn('[FeedbackLearning] Error updating pattern:', error)
    }
  }

  /**
   * Analyze error and suggest a rule (could be enhanced with AI)
   */
  private async suggestRuleFromPattern(
    signature: string,
    errorType: string,
    message: string,
    sql?: string
  ): Promise<void> {
    // Simple pattern matching for common errors
    // In future: Use AI to analyze and suggest fixes

    if (errorType === 'column') {
      // Extract column name from error message
      const columnMatch = message.match(/column[s]?\s+['"]?(\w+)['"]?/i)
        || message.match(/['"](\w+)['"].*not found/i)
        || message.match(/Invalid column.*?(\w+)/i)

      if (columnMatch) {
        const wrongColumn = columnMatch[1]
        console.log(`[FeedbackLearning] Detected frequent column error: ${wrongColumn}`)
        // Note: Auto-rule creation would need human review or AI analysis
        // For now, just log it
      }
    }
  }

  /**
   * Get all active learned rules (cached)
   */
  async getActiveRules(): Promise<LearnedRule[]> {
    const now = Date.now()

    // Return cached if valid
    if (this.rulesCache.length > 0 && now - this.rulesCacheTime < this.CACHE_TTL) {
      return this.rulesCache
    }

    try {
      const { data, error } = await supabase
        .from('learned_rules')
        .select('*')
        .eq('is_active', true)
        .order('occurrences', { ascending: false })

      if (error) {
        console.warn('[FeedbackLearning] Failed to fetch rules:', error.message)
        return this.rulesCache // Return stale cache on error
      }

      this.rulesCache = data || []
      this.rulesCacheTime = now
      return this.rulesCache
    } catch (error) {
      console.warn('[FeedbackLearning] Error fetching rules:', error)
      return this.rulesCache
    }
  }

  /**
   * Apply learned rules to fix SQL
   */
  async applyLearnedRules(sql: string): Promise<{ sql: string; appliedRules: string[] }> {
    const rules = await this.getActiveRules()
    const appliedRules: string[] = []
    let fixedSql = sql

    for (const rule of rules) {
      if (rule.rule_type === 'column_fix' || rule.rule_type === 'pattern_fix') {
        // Create regex from pattern
        const pattern = new RegExp(`\\b${this.escapeRegex(rule.pattern)}\\b`, 'gi')

        if (pattern.test(fixedSql)) {
          fixedSql = fixedSql.replace(pattern, rule.correction)
          appliedRules.push(`${rule.pattern} → ${rule.correction}`)
          console.log(`[FeedbackLearning] Applied rule: ${rule.pattern} → ${rule.correction}`)
        }
      }
    }

    return { sql: fixedSql, appliedRules }
  }

  /**
   * Store successful query for positive reinforcement
   */
  async storeSuccessfulQuery(question: string, sql: string): Promise<void> {
    await this.storeFeedback({
      question,
      sql,
      feedbackType: 'positive'
    })
  }

  /**
   * Store error case for learning
   */
  async storeErrorCase(
    question: string,
    sql: string,
    errorMessage: string
  ): Promise<void> {
    await this.storeFeedback({
      question,
      sql,
      feedbackType: 'error',
      errorMessage
    })
  }

  /**
   * Add a new rule manually or from AI suggestion
   */
  async addRule(
    ruleType: 'column_fix' | 'pattern_fix' | 'prompt_hint',
    pattern: string,
    correction: string,
    description?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('learned_rules')
        .upsert({
          rule_type: ruleType,
          pattern,
          correction,
          description,
          is_active: true,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'rule_type,pattern'
        })
        .select('id')
        .single()

      if (error) {
        console.warn('[FeedbackLearning] Failed to add rule:', error.message)
        return null
      }

      // Invalidate cache
      this.rulesCacheTime = 0

      console.log(`[FeedbackLearning] Added rule: ${pattern} → ${correction}`)
      return data?.id || null
    } catch (error) {
      console.warn('[FeedbackLearning] Error adding rule:', error)
      return null
    }
  }

  /**
   * Get error patterns that need attention
   */
  async getUnresolvedPatterns(minOccurrences: number = 3): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('error_patterns')
        .select('*')
        .eq('resolved', false)
        .gte('occurrences', minOccurrences)
        .order('occurrences', { ascending: false })
        .limit(20)

      if (error) {
        console.warn('[FeedbackLearning] Failed to fetch patterns:', error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.warn('[FeedbackLearning] Error fetching patterns:', error)
      return []
    }
  }

  /**
   * Store ALL query executions for training data
   * This logs every query regardless of outcome
   */
  async storeQueryExecution(params: {
    question: string
    plan?: string
    sql: string
    status: 'success' | 'error' | 'timeout'
    errorMessage?: string
    rowCount?: number
    executionTimeMs?: number
    userId?: string
    sessionId?: string
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('query_executions')
        .insert({
          question: params.question,
          plan: params.plan,
          sql_generated: params.sql,
          execution_status: params.status,
          error_message: params.errorMessage,
          row_count: params.rowCount,
          execution_time_ms: params.executionTimeMs,
          user_id: params.userId,
          session_id: params.sessionId
        })

      if (error) {
        console.warn('[FeedbackLearning] Failed to store query execution:', error.message)
        return
      }

      console.log(`[FeedbackLearning] Logged query execution: ${params.status}`)
    } catch (error) {
      console.warn('[FeedbackLearning] Error storing query execution:', error)
    }
  }

  /**
   * Get query statistics for dashboard
   */
  async getQueryStats(days: number = 7): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('query_stats')
        .select('*')
        .limit(days)

      if (error) {
        console.warn('[FeedbackLearning] Failed to fetch query stats:', error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.warn('[FeedbackLearning] Error fetching query stats:', error)
      return []
    }
  }

  /**
   * Get successful queries for training (positive examples)
   */
  async getSuccessfulQueries(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('successful_queries')
        .select('*')
        .limit(limit)

      if (error) {
        console.warn('[FeedbackLearning] Failed to fetch successful queries:', error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.warn('[FeedbackLearning] Error fetching successful queries:', error)
      return []
    }
  }

  /**
   * Helper: Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

// Export singleton
export const feedbackLearningService = new FeedbackLearningService()
export default feedbackLearningService
