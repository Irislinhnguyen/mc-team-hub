/**
 * Chain-of-Thought Reasoning Types
 *
 * Types for storing and managing step-by-step reasoning
 * in AI SQL generation process with conversational feedback support
 */

// ============================================================================
// Core Reasoning Structure (4-Step CoT)
// ============================================================================

export interface ReasoningStep1Understanding {
  question_type: string
  entities: string[]
  time_periods: string[]
  key_insight: string
}

export interface ReasoningStep2Breakdown {
  logic_steps: string[]
  calculations: string[]
}

export interface ReasoningStep3Constraints {
  no_product_filter?: boolean
  no_join_needed?: boolean
  join_required?: boolean
  date_ranges: string[]
  team_filter_needed?: boolean
}

export interface ReasoningStep4SqlPlan {
  cte1?: string
  cte2?: string
  cte3?: string
  main_query: string
  order_by: string
  limit?: string
}

export interface CoTReasoning {
  step1_understanding: ReasoningStep1Understanding
  step2_breakdown: ReasoningStep2Breakdown
  step3_constraints: ReasoningStep3Constraints
  step4_sql_plan: ReasoningStep4SqlPlan
}

// ============================================================================
// Conversational Feedback System
// ============================================================================

export type ReasoningStepNumber = 1 | 2 | 3 | 4

export interface ReasoningStepWithFeedback {
  stepNumber: ReasoningStepNumber
  stepName: string
  content: ReasoningStep1Understanding | ReasoningStep2Breakdown | ReasoningStep3Constraints | ReasoningStep4SqlPlan
  userFeedback?: string
  aiResponse?: string
}

export interface ReasoningBreakdown {
  questionId: string
  question: string
  reasoning: CoTReasoning
  confidence: number
  timestamp: Date
}

export interface ConversationExchange {
  id: string
  stepNumber: ReasoningStepNumber
  userFeedback: string
  aiResponse: string
  refinedContent: any
  timestamp: Date
}

export interface ConversationHistory {
  questionId: string
  exchanges: ConversationExchange[]
  totalIterations: number
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ReasoningGenerationRequest {
  question: string
  conversationHistory?: ConversationHistory
}

export interface ReasoningGenerationResponse {
  questionId: string
  reasoning: CoTReasoning
  confidence: number
  understanding: {
    summary: string
    entities: string[]
    filters: string[]
    timeRange: string
  }
}

export interface ReasoningRefinementRequest {
  questionId: string
  currentReasoning: CoTReasoning
  stepNumber: ReasoningStepNumber
  userFeedback: string
  conversationHistory: ConversationHistory
}

export interface ReasoningRefinementResponse {
  questionId: string
  refinedReasoning: CoTReasoning
  aiResponse: string
  confidence: number
}

export interface SqlGenerationFromReasoningRequest {
  questionId: string
  confirmedReasoning: CoTReasoning
  question: string
}

// ============================================================================
// SQL Validation System
// ============================================================================

export interface SqlValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  fixedSql?: string
  researchResults?: ResearchResult[]
  validationTime: number
}

export interface ValidationError {
  type: 'syntax' | 'semantic' | 'schema' | 'performance'
  message: string
  line?: number
  column?: number
  suggestedFix?: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  type: 'performance' | 'best_practice' | 'data_quality'
  message: string
  suggestion?: string
}

export interface ResearchResult {
  query: string
  source: 'bigquery_docs' | 'stackoverflow' | 'knowledge_graph'
  relevantInfo: string
  url?: string
  confidence: number
}

// ============================================================================
// SQL Generation Result (Combined)
// ============================================================================

export interface SqlGenerationResultWithReasoning {
  questionId: string
  reasoning: CoTReasoning
  understanding: {
    summary: string
    entities: string[]
    filters: string[]
    timeRange: string
    confidence: number
  }
  sql: string
  warnings: string[]
  validation?: SqlValidationResult
  self_corrected?: boolean
  reasoning_pattern_id?: string
}

// ============================================================================
// Knowledge Graph Storage Types
// ============================================================================

export interface ReasoningPattern {
  patternId: string
  questionType: string
  step1Understanding: ReasoningStep1Understanding
  step2Breakdown: ReasoningStep2Breakdown
  step3Constraints: ReasoningStep3Constraints
  step4SqlPlan: ReasoningStep4SqlPlan
  confidence: number
  useCount: number
  feedbackCount: number
  createdAt: Date
  lastUsed: Date
}

export interface FeedbackRefinement {
  refinementId: string
  stepNumber: ReasoningStepNumber
  originalContent: any
  userFeedback: string
  refinedContent: any
  wasAccepted: boolean
  timestamp: Date
}

// Legacy types (keep for backward compatibility)
export interface ReasoningChain {
  id?: string
  questionType: string
  questionPattern: string
  confidence: number
  successCount: number
  failureCount: number
  lastUsed?: Date
  createdAt?: Date
}

export interface ReasoningStep {
  stepNumber: number
  stepType: 'understanding' | 'breakdown' | 'constraints' | 'sql_plan'
  description: string
  keyInsight?: string
  sqlFragment?: string
  patternsUsed?: string[]
}

export interface LogicPattern {
  id: string
  name: string
  description: string
  sqlTemplate: string
  applicableTo: string[]
  useCount: number
  examples: string[]
}
