/**
 * OpenAI Service
 * Provides AI-powered analysis of BigQuery query results
 * Port from Python: src/ai/analysis/analyzer.py
 */

import { OpenAI } from 'openai'
import { settings, isOpenAIEnabled } from '../utils/config'

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
    generatedQuery?: string
  ): Promise<AnalysisResult | null> {
    if (!this.client) {
      console.warn('[OpenAI] Analyzer not initialized - skipping analysis')
      return null
    }

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
    queryResult?: QueryResult
  ): Promise<{ valid: boolean; feedback: string; score: number }> {
    if (!this.client) {
      return { valid: true, feedback: 'OpenAI validation disabled', score: 50 }
    }

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
      console.error('[OpenAI] Query validation failed:', error)
      return {
        valid: true,
        feedback: 'Validation skipped due to error',
        score: 0,
      }
    }
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
