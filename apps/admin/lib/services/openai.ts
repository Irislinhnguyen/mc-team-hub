/**
 * OpenAI Service
 * Provides AI-powered analysis of BigQuery query results
 * Port from Python: src/ai/analysis/analyzer.py
 */

import { OpenAI } from 'openai'
import { settings, isOpenAIEnabled } from '../utils/config'
import { OpenAIUsageTracker, UserContext } from './openaiUsageTracker'

interface QueryResult {
  rows: any[]
  schema?: any
  rowCount?: number
  executionTime?: number
}

interface AnalysisResult {
  analysis: string
  keyInsights: string[]
  recommendations: string[]
  validationScore: number
  dataQualityIssues: string[]
}

class OpenAIAnalyzer {
  private client: OpenAI | null = null

  constructor() {
    if (isOpenAIEnabled()) {
      this.client = new OpenAI({
        apiKey: settings.openaiApiKey,
      })
      console.log(`[OpenAI] Analyzer initialized with model: ${settings.openaiModel}`)
    } else {
      console.warn('[OpenAI] OpenAI is not enabled - API key not configured')
    }
  }

  /**
   * Analyze query results using OpenAI
   */
  async analyzeQueryResult(
    userQuestion: string,
    queryResult: QueryResult,
    generatedQuery?: string,
    user?: UserContext
  ): Promise<AnalysisResult | null> {
    if (!this.client) {
      console.warn('[OpenAI] Analyzer not initialized - skipping analysis')
      return null
    }

    // Initialize tracker if user context is provided
    const tracker = user
      ? new OpenAIUsageTracker(user, 'result_analysis', '/api/analyze')
      : null

    try {
      const prompt = this.buildAnalysisPrompt(userQuestion, queryResult, generatedQuery)

      console.log('[OpenAI] Sending analysis request...')
      const response = await this.client.chat.completions.create({
        model: settings.openaiModel,
        messages: [
          {
            role: 'system',
            content: `You are an intelligent business analyst for GI_Publisher advertising data.
Your role is to:
1. Analyze query results and identify patterns
2. Spot anomalies and potential data quality issues
3. Provide actionable business recommendations
4. Explain insights in clear, non-technical language

Format your response as JSON with these fields:
- analysis: Detailed paragraph analysis
- keyInsights: Array of 3-5 key insights (strings)
- recommendations: Array of 2-3 actionable recommendations (strings)
- validationScore: Number 0-100 indicating data quality confidence
- dataQualityIssues: Array of any data quality concerns (strings)`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      })

      // Log usage
      if (tracker) {
        await tracker.logUsage(response, userQuestion)
      }

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response from OpenAI')
      }

      // Parse JSON response
      const analysisData = JSON.parse(content)

      console.log('[OpenAI] Analysis completed successfully')
      return {
        analysis: analysisData.analysis || '',
        keyInsights: analysisData.keyInsights || [],
        recommendations: analysisData.recommendations || [],
        validationScore: analysisData.validationScore || 75,
        dataQualityIssues: analysisData.dataQualityIssues || [],
      }
    } catch (error) {
      // Log error
      if (tracker) {
        await tracker.logError(error, settings.openaiModel, userQuestion)
      }

      console.error('[OpenAI] Analysis failed:', error)
      throw new Error(`OpenAI analysis failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Build analysis prompt from query context
   */
  private buildAnalysisPrompt(
    userQuestion: string,
    queryResult: QueryResult,
    generatedQuery?: string
  ): string {
    const sampleRows = queryResult.rows.slice(0, 10)
    const rowCount = queryResult.rows.length
    const hasMoreRows = queryResult.rows.length > 10

    let prompt = `User Question: ${userQuestion}\n\n`

    if (generatedQuery) {
      prompt += `Generated SQL Query:\n${generatedQuery}\n\n`
    }

    prompt += `Query Results Summary:
- Total Rows Returned: ${rowCount}
- Columns: ${queryResult.schema?.map((col: any) => col.name || col).join(', ') || 'Unknown'}
- Execution Time: ${queryResult.executionTime || 'Unknown'}ms

Sample Data (${Math.min(10, rowCount)} rows shown${hasMoreRows ? ` of ${rowCount}` : ''}):\n`

    // Format sample data as readable table
    prompt += '```\n'
    if (sampleRows.length > 0) {
      const headers = Object.keys(sampleRows[0]).join('\t')
      prompt += headers + '\n'
      sampleRows.forEach((row) => {
        const values = Object.values(row)
          .map((v) => (v === null ? 'NULL' : String(v).substring(0, 20)))
          .join('\t')
        prompt += values + '\n'
      })
    }
    prompt += '```\n\n'

    prompt += `Please analyze this data and provide:
1. A comprehensive analysis of what the data shows
2. Key business insights and patterns
3. Any anomalies or unexpected results
4. Data quality assessment
5. Actionable recommendations`

    return prompt
  }

  /**
   * Validate query quality using OpenAI
   */
  async validateQuery(
    userQuestion: string,
    generatedQuery: string,
    queryResult?: QueryResult,
    user?: UserContext
  ): Promise<{ valid: boolean; feedback: string; score: number }> {
    if (!this.client) {
      return { valid: true, feedback: 'OpenAI validation disabled', score: 50 }
    }

    // Initialize tracker if user context is provided
    const tracker = user
      ? new OpenAIUsageTracker(user, 'query_validation', '/api/validate')
      : null

    try {
      const prompt = `User asked: "${userQuestion}"
Generated SQL: ${generatedQuery}
${queryResult ? `\nQuery returned ${queryResult.rows.length} rows` : ''}

Is this SQL query appropriate for the user's question? Evaluate on:
1. Does it answer the question?
2. Is the SQL valid?
3. Are there efficiency concerns?
4. Any security issues?

Provide JSON response with:
- valid: boolean
- feedback: string (brief explanation)
- score: number (0-100)`

      const response = await this.client.chat.completions.create({
        model: settings.openaiModel,
        messages: [
          {
            role: 'system',
            content: 'You are a SQL query validator. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      })

      // Log usage
      if (tracker) {
        await tracker.logUsage(response, userQuestion)
      }

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No validation response from OpenAI')
      }

      const validationData = JSON.parse(content)
      return {
        valid: validationData.valid || true,
        feedback: validationData.feedback || 'Query validation completed',
        score: validationData.score || 75,
      }
    } catch (error) {
      // Log error
      if (tracker) {
        await tracker.logError(error, settings.openaiModel, userQuestion)
      }

      console.error('[OpenAI] Query validation failed:', error)
      return {
        valid: true,
        feedback: 'Validation skipped due to error',
        score: 0,
      }
    }
  }

  /**
   * Generate a concise session title from user prompt
   * Uses GPT-4o-mini for cost-effective summarization
   */
  async generateSessionTitle(userPrompt: string): Promise<string> {
    if (!this.client) {
      console.warn('[OpenAI] Client not initialized - using fallback title generation')
      return this.fallbackTitleGeneration(userPrompt)
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a title summarizer. Convert user prompts into concise, meaningful session titles.

Requirements:
- Output ONLY the title, nothing else
- 5-8 words maximum
- Preserve key entities (names, metrics, time periods)
- Use title case
- Support both Vietnamese and English
- Remove filler words (please, can you, show me, etc.)
- Keep important numbers and names

Examples:
Input: "Thôi, hiển thị top 5 zone của vn_minhlv trong tháng 10"
Output: Top 5 Zones - VN_MinhLV Oct

Input: "Can you please show me the sales performance by team for last quarter"
Output: Sales Performance by Team - Q3

Input: "tìm các products có revenue cao nhất của team A"
Output: Top Products - Team A Revenue

Input: "What are the best performing publishers in Vietnam market?"
Output: Top Publishers - Vietnam Market`
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 30
      })

      const title = completion.choices[0]?.message?.content?.trim()

      if (!title) {
        console.warn('[OpenAI] Empty title generated, using fallback')
        return this.fallbackTitleGeneration(userPrompt)
      }

      console.log(`[OpenAI] Generated title: "${title}" from prompt: "${userPrompt.substring(0, 50)}..."`)
      return title

    } catch (error) {
      console.error('[OpenAI] Title generation failed:', error)
      return this.fallbackTitleGeneration(userPrompt)
    }
  }

  /**
   * Fallback title generation when OpenAI is unavailable
   */
  private fallbackTitleGeneration(content: string): string {
    let title = content
      .replace(/^(show|find|get|list|display|what|how|can you|please|tìm|hiển thị|liệt kê|cho tôi|xem|cho|mình|tôi|thôi)\s+/i, '')
      .replace(/[?!.,]+$/, '')
      .trim()

    title = title.charAt(0).toUpperCase() + title.slice(1)

    if (title.length > 50) {
      title = title.substring(0, 47) + '...'
    }

    if (!title) {
      title = `Query ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    }

    return title
  }
}

// Singleton instance
let analyzerInstance: OpenAIAnalyzer | null = null

export function getOpenAIAnalyzer(): OpenAIAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new OpenAIAnalyzer()
  }
  return analyzerInstance
}

export type { AnalysisResult, QueryResult }
