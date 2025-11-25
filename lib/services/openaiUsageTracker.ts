/**
 * OpenAI Usage Tracker Service
 *
 * This service provides comprehensive tracking of OpenAI API usage including:
 * - Token consumption (prompt, completion, total)
 * - Cost calculation based on model pricing
 * - Per-user, per-feature, per-model tracking
 * - Automatic logging to database
 *
 * Usage:
 * ```typescript
 * const tracker = new OpenAIUsageTracker(user, 'sql_generation', '/api/query-lab/gen-sql');
 * const response = await openai.chat.completions.create(...);
 * await tracker.logUsage(response, startTime);
 * ```
 */

import { createAdminClient } from '@/lib/supabase/server';

// ============================================================================
// Types
// ============================================================================

export interface OpenAIUsageData {
  userId: string;
  userEmail: string;
  userRole: 'admin' | 'manager' | 'user';
  endpoint: string;
  feature: OpenAIFeature;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  requestSummary?: string;
  responseStatus: 'success' | 'error' | 'timeout' | 'rate_limit';
  errorMessage?: string;
  executionTimeMs?: number;
}

export type OpenAIFeature =
  | 'sql_generation'
  | 'kg_sql_generation'
  | 'sql_refinement'      // NEW: For follow-up questions using gpt-4o-mini
  | 'query_parsing'
  | 'result_analysis'
  | 'query_validation'
  | 'reasoning'
  | 'simple_plan'
  | 'plan_update'
  | 'reasoning_refinement';

export interface UserContext {
  userId: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
}

// ============================================================================
// Model Pricing Configuration
// ============================================================================

/**
 * OpenAI Model Pricing (USD per 1M tokens)
 * Updated: January 2025
 * Source: https://openai.com/pricing
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // GPT-4 Turbo
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
  'gpt-4-turbo-2024-04-09': { input: 10.00, output: 30.00 },

  // GPT-4o (Optimized)
  'gpt-4o': { input: 5.00, output: 15.00 },
  'gpt-4o-2024-05-13': { input: 5.00, output: 15.00 },
  'gpt-4o-2024-08-06': { input: 2.50, output: 10.00 },

  // GPT-4o Mini (Cost-effective)
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },

  // GPT-4 (Legacy)
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-4-0613': { input: 30.00, output: 60.00 },
  'gpt-4-32k': { input: 60.00, output: 120.00 },

  // GPT-3.5 Turbo (Legacy)
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-3.5-turbo-0125': { input: 0.50, output: 1.50 },
  'gpt-3.5-turbo-16k': { input: 3.00, output: 4.00 },
};

/**
 * Default pricing for unknown models (use GPT-4o pricing as baseline)
 */
const DEFAULT_PRICING = { input: 5.00, output: 15.00 };

// ============================================================================
// OpenAI Usage Tracker Class
// ============================================================================

export class OpenAIUsageTracker {
  private user: UserContext;
  private feature: OpenAIFeature;
  private endpoint: string;
  private startTime: number;

  constructor(user: UserContext, feature: OpenAIFeature, endpoint: string) {
    this.user = user;
    this.feature = feature;
    this.endpoint = endpoint;
    this.startTime = Date.now();
  }

  /**
   * Calculate cost based on token usage and model pricing
   */
  private calculateCost(model: string, promptTokens: number, completionTokens: number): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } {
    // Get pricing for the model, fallback to default if not found
    const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;

    // Calculate costs (pricing is per 1M tokens)
    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputCost: parseFloat(inputCost.toFixed(6)),
      outputCost: parseFloat(outputCost.toFixed(6)),
      totalCost: parseFloat(totalCost.toFixed(6)),
    };
  }

  /**
   * Truncate request to first 200 characters for logging
   */
  private truncateRequest(request: string | undefined): string | undefined {
    if (!request) return undefined;
    if (request.length <= 200) return request;
    return request.substring(0, 197) + '...';
  }

  /**
   * Log successful OpenAI API call
   */
  async logUsage(
    response: any,
    requestSummary?: string
  ): Promise<void> {
    try {
      const executionTimeMs = Date.now() - this.startTime;

      // Extract usage data from OpenAI response
      const usage = response.usage;
      if (!usage) {
        console.warn('[OpenAI Tracker] No usage data in response, skipping log');
        return;
      }

      const model = response.model || 'unknown';
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || (promptTokens + completionTokens);

      // Calculate costs
      const { inputCost, outputCost, totalCost } = this.calculateCost(
        model,
        promptTokens,
        completionTokens
      );

      // Prepare usage data
      const usageData: OpenAIUsageData = {
        userId: this.user.userId,
        userEmail: this.user.email,
        userRole: this.user.role,
        endpoint: this.endpoint,
        feature: this.feature,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        inputCost,
        outputCost,
        totalCost,
        requestSummary: this.truncateRequest(requestSummary),
        responseStatus: 'success',
        executionTimeMs,
      };

      // Log to database
      await this.saveToDatabase(usageData);

      // Log to console for debugging
      console.log(`[OpenAI Tracker] ${this.feature} | ${model} | ${totalTokens} tokens | $${totalCost.toFixed(4)} | ${executionTimeMs}ms`);

    } catch (error) {
      console.error('[OpenAI Tracker] Failed to log usage:', error);
      // Don't throw - tracking failures shouldn't break the main flow
    }
  }

  /**
   * Log failed OpenAI API call
   */
  async logError(
    error: any,
    model?: string,
    requestSummary?: string
  ): Promise<void> {
    try {
      const executionTimeMs = Date.now() - this.startTime;

      // Determine error type
      let responseStatus: 'error' | 'timeout' | 'rate_limit' = 'error';
      if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
        responseStatus = 'timeout';
      } else if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
        responseStatus = 'rate_limit';
      }

      const usageData: OpenAIUsageData = {
        userId: this.user.userId,
        userEmail: this.user.email,
        userRole: this.user.role,
        endpoint: this.endpoint,
        feature: this.feature,
        model: model || 'unknown',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        requestSummary: this.truncateRequest(requestSummary),
        responseStatus,
        errorMessage: error?.message || String(error),
        executionTimeMs,
      };

      await this.saveToDatabase(usageData);

      console.error(`[OpenAI Tracker] ${this.feature} | ${responseStatus} | ${executionTimeMs}ms`);

    } catch (logError) {
      console.error('[OpenAI Tracker] Failed to log error:', logError);
    }
  }

  /**
   * Check if a string is a valid UUID
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Save usage data to Supabase
   */
  private async saveToDatabase(data: OpenAIUsageData): Promise<void> {
    console.log('[OpenAI Tracker] Saving to database:', {
      userId: data.userId,
      email: data.userEmail,
      feature: data.feature,
      model: data.model,
      tokens: data.totalTokens,
      cost: data.totalCost
    });

    const supabase = await createAdminClient();

    // user_id column is UUID type - only insert if valid UUID, otherwise null
    const userId = this.isValidUUID(data.userId) ? data.userId : null;

    const { error } = await supabase
      .from('openai_usage_logs')
      .insert({
        user_id: userId,  // null if not a valid UUID (e.g., 'anonymous')
        user_email: data.userEmail,
        user_role: data.userRole,
        endpoint: data.endpoint,
        feature: data.feature,
        model: data.model,
        prompt_tokens: data.promptTokens,
        completion_tokens: data.completionTokens,
        total_tokens: data.totalTokens,
        input_cost: data.inputCost,
        output_cost: data.outputCost,
        total_cost: data.totalCost,
        request_summary: data.requestSummary,
        response_status: data.responseStatus,
        error_message: data.errorMessage,
        execution_time_ms: data.executionTimeMs,
      });

    if (error) {
      console.error('[OpenAI Tracker] Database insert failed:', error);
      throw error;
    }

    console.log('[OpenAI Tracker] Successfully saved to database');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Quick helper to log OpenAI usage without creating a tracker instance
 */
export async function logOpenAIUsage(
  user: UserContext,
  feature: OpenAIFeature,
  endpoint: string,
  response: any,
  requestSummary?: string,
  startTime?: number
): Promise<void> {
  const tracker = new OpenAIUsageTracker(user, feature, endpoint);
  if (startTime) {
    tracker['startTime'] = startTime; // Override start time if provided
  }
  await tracker.logUsage(response, requestSummary);
}

/**
 * Quick helper to log OpenAI errors without creating a tracker instance
 */
export async function logOpenAIError(
  user: UserContext,
  feature: OpenAIFeature,
  endpoint: string,
  error: any,
  model?: string,
  requestSummary?: string,
  startTime?: number
): Promise<void> {
  const tracker = new OpenAIUsageTracker(user, feature, endpoint);
  if (startTime) {
    tracker['startTime'] = startTime;
  }
  await tracker.logError(error, model, requestSummary);
}

/**
 * Calculate total cost for given tokens and model
 * Useful for estimating costs before making API calls
 */
export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return parseFloat((inputCost + outputCost).toFixed(6));
}

/**
 * Get pricing information for a model
 */
export function getModelPricing(model: string): { input: number; output: number } {
  return MODEL_PRICING[model] || DEFAULT_PRICING;
}

/**
 * List all supported models with pricing
 */
export function getSupportedModels(): Array<{
  model: string;
  inputPrice: number;
  outputPrice: number;
}> {
  return Object.entries(MODEL_PRICING).map(([model, pricing]) => ({
    model,
    inputPrice: pricing.input,
    outputPrice: pricing.output,
  }));
}

// ============================================================================
// Export all
// ============================================================================

export default OpenAIUsageTracker;
