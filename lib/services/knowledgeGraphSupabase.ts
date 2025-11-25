/**
 * Knowledge Graph Service - Supabase Implementation
 *
 * Provides AI "brain" functionality:
 * - Concept extraction from natural language
 * - Schema resolution (concepts → columns/tables)
 * - Pattern matching for query generation
 * - Business rule checking
 * - Learning from successful queries
 *
 * Replaces the deprecated Neo4j implementation
 */

import { createAdminClient } from '@/lib/supabase/server'

// ============================================================================
// TYPES
// ============================================================================

export interface KGTable {
  id: string
  name: string
  full_path: string
  description: string
  table_type: string
  columns_json: Array<{
    name: string
    type: string
    description: string
    is_key: boolean
  }>
  join_hints: Array<{
    to_table: string
    join_type: string
    on_condition: string
  }> | null
}

export interface KGConcept {
  id: string
  term_vi: string | null
  term_en: string | null
  term_jp: string | null
  term_id: string | null
  maps_to_type: string
  maps_to_value: string
  maps_to_table: string | null
  context: string | null
  priority: number
  usage_count: number
}

export interface KGQueryPattern {
  id: string
  pattern_name: string
  pattern_category: string
  intent_keywords: string[]
  intent_description: string
  sql_template: string
  required_params: Array<{
    name: string
    type: string
    description: string
    default?: any
  }>
  example_questions: string[]
  success_count: number
  failure_count: number
}

export interface KGBusinessRule {
  id: string
  rule_name: string
  rule_type: string
  description: string
  condition_sql: string
  applies_to_entities: string[]
}

export interface ExtractedConcept {
  original_text: string
  matched_term: string
  concept: KGConcept
  confidence: number
}

export interface SchemaContext {
  tables: KGTable[]
  columns: Array<{
    table: string
    column: string
    type: string
    description: string
  }>
  joins: Array<{
    from_table: string
    to_table: string
    join_type: string
    on_condition: string
  }>
  expressions: Array<{
    name: string
    expression: string
    context: string
  }>
}

export interface AIContext {
  concepts: ExtractedConcept[]
  schema: SchemaContext
  patterns: KGQueryPattern[]
  rules: KGBusinessRule[]
  examples: Array<{
    question: string
    sql: string
    similarity: number
  }>
  prompt_context: string
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class KnowledgeGraphService {
  private conceptCache: Map<string, KGConcept[]> = new Map()
  private patternCache: KGQueryPattern[] | null = null
  private tableCache: KGTable[] | null = null
  private ruleCache: KGBusinessRule[] | null = null
  private cacheExpiry: number = 5 * 60 * 1000 // 5 minutes
  private lastCacheTime: number = 0

  /**
   * Clear cache (for testing or manual refresh)
   */
  clearCache(): void {
    this.conceptCache.clear()
    this.patternCache = null
    this.tableCache = null
    this.ruleCache = null
    this.lastCacheTime = 0
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheTime < this.cacheExpiry
  }

  // ==========================================================================
  // CONCEPT EXTRACTION
  // ==========================================================================

  /**
   * Extract concepts from a natural language query
   */
  async extractConcepts(query: string): Promise<ExtractedConcept[]> {
    const supabase = await createAdminClient()
    const results: ExtractedConcept[] = []
    const queryLower = query.toLowerCase()

    // Get all active concepts
    const { data: concepts, error } = await supabase
      .from('kg_concepts')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error || !concepts) {
      console.error('[KG] Error fetching concepts:', error)
      return []
    }

    // Match concepts against query
    for (const concept of concepts) {
      const terms = [concept.term_vi, concept.term_en, concept.term_jp, concept.term_id]
        .filter(Boolean) as string[]

      for (const term of terms) {
        const termLower = term.toLowerCase()
        if (queryLower.includes(termLower)) {
          // Check if this concept is already matched (avoid duplicates)
          const alreadyMatched = results.some(r => r.concept.id === concept.id)
          if (!alreadyMatched) {
            results.push({
              original_text: term,
              matched_term: termLower,
              concept: concept as KGConcept,
              confidence: this.calculateConfidence(queryLower, termLower)
            })
          }
        }
      }
    }

    // Update usage count for matched concepts (non-blocking)
    this.updateConceptUsage(results.map(r => r.concept.id))

    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Calculate confidence score for a match
   */
  private calculateConfidence(query: string, term: string): number {
    // Exact match gets higher score
    if (query === term) return 1.0

    // Longer terms get higher confidence (more specific)
    const lengthFactor = Math.min(term.length / 20, 0.3)

    // Word boundary match gets higher score
    const wordBoundaryMatch = new RegExp(`\\b${term}\\b`, 'i').test(query)
    const boundaryFactor = wordBoundaryMatch ? 0.3 : 0

    // Base confidence
    const baseConfidence = 0.5

    return Math.min(baseConfidence + lengthFactor + boundaryFactor, 1.0)
  }

  /**
   * Update concept usage counts
   */
  private async updateConceptUsage(conceptIds: string[]): Promise<void> {
    if (conceptIds.length === 0) return

    try {
      const supabase = await createAdminClient()
      for (const id of conceptIds) {
        await supabase.rpc('increment_concept_usage', { concept_id: id })
      }
    } catch (error) {
      console.error('[KG] Error updating concept usage:', error)
    }
  }

  // ==========================================================================
  // SCHEMA RESOLUTION
  // ==========================================================================

  /**
   * Resolve extracted concepts to schema elements
   */
  async resolveToSchema(concepts: ExtractedConcept[]): Promise<SchemaContext> {
    const tables: KGTable[] = []
    const columns: SchemaContext['columns'] = []
    const joins: SchemaContext['joins'] = []
    const expressions: SchemaContext['expressions'] = []

    // Get table metadata
    const allTables = await this.getTables()
    const tableMap = new Map(allTables.map(t => [t.name, t]))

    // Process each concept
    for (const { concept } of concepts) {
      switch (concept.maps_to_type) {
        case 'column':
          // Add column info
          const tableName = concept.maps_to_table || 'pub_data'
          const table = tableMap.get(tableName)
          if (table) {
            const colInfo = table.columns_json?.find(c => c.name === concept.maps_to_value)
            columns.push({
              table: tableName,
              column: concept.maps_to_value,
              type: colInfo?.type || 'STRING',
              description: colInfo?.description || concept.context || ''
            })

            // Add table if not already added
            if (!tables.find(t => t.name === tableName)) {
              tables.push(table)
            }
          }
          break

        case 'table':
          const targetTable = tableMap.get(concept.maps_to_value)
          if (targetTable && !tables.find(t => t.name === targetTable.name)) {
            tables.push(targetTable)
          }
          break

        case 'expression':
          expressions.push({
            name: concept.term_en || concept.term_vi || '',
            expression: concept.maps_to_value,
            context: concept.context || ''
          })
          break

        case 'entity':
          // Entity maps to a column used for grouping/filtering
          const entityTable = concept.maps_to_table || 'pub_data'
          const entityTableInfo = tableMap.get(entityTable)
          if (entityTableInfo) {
            const colInfo = entityTableInfo.columns_json?.find(c => c.name === concept.maps_to_value)
            columns.push({
              table: entityTable,
              column: concept.maps_to_value,
              type: colInfo?.type || 'INT64',
              description: colInfo?.description || concept.context || ''
            })
            if (!tables.find(t => t.name === entityTable)) {
              tables.push(entityTableInfo)
            }
          }
          break
      }
    }

    // Add joins between tables
    for (const table of tables) {
      if (table.join_hints) {
        for (const hint of table.join_hints) {
          if (tables.find(t => t.name === hint.to_table)) {
            joins.push({
              from_table: table.name,
              to_table: hint.to_table,
              join_type: hint.join_type,
              on_condition: hint.on_condition
            })
          }
        }
      }
    }

    // If product-related and pub_data is included, ensure join to updated_product_name
    const hasProductConcept = concepts.some(c =>
      c.concept.maps_to_value === 'product' ||
      c.matched_term.includes('product') ||
      c.matched_term.includes('format') ||
      c.matched_term.includes('sản phẩm')
    )
    if (hasProductConcept && tables.find(t => t.name === 'pub_data')) {
      const productTable = tableMap.get('updated_product_name')
      if (productTable && !tables.find(t => t.name === 'updated_product_name')) {
        tables.push(productTable)
        joins.push({
          from_table: 'pub_data',
          to_table: 'updated_product_name',
          join_type: 'LEFT JOIN',
          on_condition: 'p.pid = u.pid AND p.mid = u.mid AND p.zid = u.zid'
        })
      }
    }

    return { tables, columns, joins, expressions }
  }

  // ==========================================================================
  // PATTERN MATCHING
  // ==========================================================================

  /**
   * Match query intent to available patterns
   */
  async matchPatterns(query: string, concepts: ExtractedConcept[]): Promise<KGQueryPattern[]> {
    const patterns = await this.getPatterns()
    const queryLower = query.toLowerCase()
    const matchedPatterns: Array<{ pattern: KGQueryPattern; score: number }> = []

    for (const pattern of patterns) {
      let score = 0

      // Check intent keywords
      for (const keyword of pattern.intent_keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          score += 0.3
        }
      }

      // Check if concepts align with pattern
      const conceptTypes = concepts.map(c => c.concept.maps_to_type)
      if (pattern.pattern_category === 'ranking' && conceptTypes.includes('aggregate_function')) {
        score += 0.2
      }
      if (pattern.pattern_category === 'comparison' &&
          (queryLower.includes('so với') || queryLower.includes('compare'))) {
        score += 0.2
      }
      if (pattern.pattern_category === 'breakdown' &&
          (queryLower.includes('lý do') || queryLower.includes('nguyên nhân') || queryLower.includes('breakdown'))) {
        score += 0.2
      }

      // Check example questions similarity (simple word overlap)
      for (const example of pattern.example_questions) {
        const overlap = this.wordOverlap(queryLower, example.toLowerCase())
        if (overlap > 0.3) {
          score += overlap * 0.3
        }
      }

      // Add success rate factor
      const totalCount = pattern.success_count + pattern.failure_count
      if (totalCount > 0) {
        const successRate = pattern.success_count / totalCount
        score += successRate * 0.1
      }

      if (score > 0.2) {
        matchedPatterns.push({ pattern, score })
      }
    }

    // Sort by score and return top patterns
    return matchedPatterns
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(m => m.pattern)
  }

  /**
   * Calculate word overlap between two strings
   */
  private wordOverlap(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2))
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2))
    const intersection = [...words1].filter(w => words2.has(w))
    const union = new Set([...words1, ...words2])
    return union.size > 0 ? intersection.length / union.size : 0
  }

  // ==========================================================================
  // BUSINESS RULES
  // ==========================================================================

  /**
   * Get applicable business rules
   */
  async getApplicableRules(concepts: ExtractedConcept[]): Promise<KGBusinessRule[]> {
    const rules = await this.getRules()

    // Filter rules that apply to detected entities
    const entityTypes = concepts
      .filter(c => c.concept.maps_to_type === 'entity')
      .map(c => c.concept.maps_to_value)

    return rules.filter(rule => {
      if (!rule.applies_to_entities) return false
      return entityTypes.some(e => rule.applies_to_entities.includes(e))
    })
  }

  // ==========================================================================
  // SIMILAR EXAMPLES
  // ==========================================================================

  /**
   * Get similar successful query examples
   * Optimized: Fetch fewer examples to reduce context size and cost
   */
  async getSimilarExamples(query: string, limit: number = 3): Promise<Array<{
    question: string
    sql: string
    similarity: number
  }>> {
    const supabase = await createAdminClient()

    // Simple text-based similarity (for now, without embeddings)
    // Optimized: Reduced from 100 to 30 examples to fetch
    const { data: examples, error } = await supabase
      .from('kg_examples')
      .select('question, sql_generated, feedback_type')
      .in('feedback_type', ['auto_success', 'user_positive'])
      .limit(30)

    if (error || !examples) {
      console.error('[KG] Error fetching examples:', error)
      return []
    }

    const queryLower = query.toLowerCase()
    const scored = examples
      .map(ex => ({
        question: ex.question,
        sql: ex.sql_generated,
        similarity: this.wordOverlap(queryLower, ex.question.toLowerCase())
      }))
      .filter(ex => ex.similarity > 0.2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    return scored
  }

  // ==========================================================================
  // AI CONTEXT BUILDING
  // ==========================================================================

  /**
   * Build complete AI context for a query
   */
  async buildAIContext(query: string): Promise<AIContext> {
    // 1. Extract concepts
    const concepts = await this.extractConcepts(query)

    // 2. Resolve to schema
    const schema = await this.resolveToSchema(concepts)

    // 3. Match patterns
    const patterns = await this.matchPatterns(query, concepts)

    // 4. Get applicable rules
    const rules = await this.getApplicableRules(concepts)

    // 5. Get similar examples
    const examples = await this.getSimilarExamples(query)

    // 6. Build prompt context string
    const prompt_context = this.buildPromptContext(concepts, schema, patterns, rules, examples)

    return {
      concepts,
      schema,
      patterns,
      rules,
      examples,
      prompt_context
    }
  }

  /**
   * Build a concise prompt context string for AI
   */
  private buildPromptContext(
    concepts: ExtractedConcept[],
    schema: SchemaContext,
    patterns: KGQueryPattern[],
    rules: KGBusinessRule[],
    examples: Array<{ question: string; sql: string; similarity: number }>
  ): string {
    const parts: string[] = []

    // Detected concepts
    if (concepts.length > 0) {
      parts.push('DETECTED CONCEPTS:')
      for (const c of concepts.slice(0, 10)) {
        parts.push(`- "${c.original_text}" → ${c.concept.maps_to_type}:${c.concept.maps_to_value}`)
      }
    }

    // Relevant tables
    if (schema.tables.length > 0) {
      parts.push('\nRELEVANT TABLES:')
      for (const t of schema.tables) {
        parts.push(`- ${t.full_path} (${t.table_type}): ${t.description}`)
      }
    }

    // Required columns
    if (schema.columns.length > 0) {
      parts.push('\nRELEVANT COLUMNS:')
      for (const c of schema.columns) {
        parts.push(`- ${c.table}.${c.column} (${c.type}): ${c.description}`)
      }
    }

    // Joins needed
    if (schema.joins.length > 0) {
      parts.push('\nJOIN HINTS:')
      for (const j of schema.joins) {
        parts.push(`- ${j.join_type} ${j.to_table} ON ${j.on_condition}`)
      }
    }

    // Expressions to use
    if (schema.expressions.length > 0) {
      parts.push('\nEXPRESSIONS:')
      for (const e of schema.expressions) {
        parts.push(`- ${e.name}: ${e.expression}`)
      }
    }

    // Matched patterns
    if (patterns.length > 0) {
      parts.push('\nSUGGESTED PATTERNS:')
      for (const p of patterns) {
        parts.push(`- ${p.pattern_name}: ${p.intent_description}`)
      }
    }

    // Business rules
    if (rules.length > 0) {
      parts.push('\nBUSINESS RULES:')
      for (const r of rules) {
        parts.push(`- ${r.rule_name}: ${r.description}`)
      }
    }

    // Similar examples
    if (examples.length > 0) {
      parts.push('\nSIMILAR EXAMPLES:')
      for (const e of examples.slice(0, 3)) {
        parts.push(`Q: ${e.question}`)
        parts.push(`SQL: ${e.sql.substring(0, 200)}...`)
      }
    }

    return parts.join('\n')
  }

  // ==========================================================================
  // LEARNING / FEEDBACK
  // ==========================================================================

  /**
   * Store a successful query example
   */
  async storeExample(
    question: string,
    sql: string,
    options: {
      language?: string
      tables_used?: string[]
      concepts_used?: string[]
      patterns_used?: string[]
      result_row_count?: number
      result_columns?: string[]
      execution_time_ms?: number
      feedback_type?: string
      user_id?: string
    } = {}
  ): Promise<void> {
    try {
      const supabase = await createAdminClient()
      await supabase.from('kg_examples').insert({
        question,
        sql_generated: sql,
        question_language: options.language || 'vi',
        tables_used: options.tables_used || null,
        concepts_used: options.concepts_used || null,
        patterns_used: options.patterns_used || null,
        result_row_count: options.result_row_count || null,
        result_columns: options.result_columns || null,
        execution_time_ms: options.execution_time_ms || null,
        feedback_type: options.feedback_type || 'auto_success',
        user_id: options.user_id || null
      })
    } catch (error) {
      console.error('[KG] Error storing example:', error)
    }
  }

  /**
   * Update pattern metrics after execution
   */
  async updatePatternMetrics(patternId: string, success: boolean, executionTimeMs?: number): Promise<void> {
    try {
      const supabase = await createAdminClient()
      await supabase.rpc('update_pattern_metrics', {
        pattern_id: patternId,
        is_success: success,
        exec_time_ms: executionTimeMs || null
      })
    } catch (error) {
      console.error('[KG] Error updating pattern metrics:', error)
    }
  }

  /**
   * Suggest a new concept (from unrecognized terms)
   */
  async suggestConcept(
    term: string,
    suggestedMapping: { type: string; value: string; table?: string },
    sourceQuestion: string
  ): Promise<void> {
    try {
      const supabase = await createAdminClient()
      await supabase.rpc('upsert_kg_suggestion', {
        p_suggestion_type: 'new_concept',
        p_suggested_data: {
          term,
          maps_to_type: suggestedMapping.type,
          maps_to_value: suggestedMapping.value,
          maps_to_table: suggestedMapping.table
        },
        p_source_type: 'auto_detected',
        p_source_question: sourceQuestion
      })
    } catch (error) {
      console.error('[KG] Error suggesting concept:', error)
    }
  }

  // ==========================================================================
  // DATA ACCESS (with caching)
  // ==========================================================================

  /**
   * Get all active tables
   */
  async getTables(): Promise<KGTable[]> {
    if (this.tableCache && this.isCacheValid()) {
      return this.tableCache
    }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('kg_tables')
      .select('*')
      .eq('is_active', true)

    if (error || !data) {
      console.error('[KG] Error fetching tables:', error)
      return []
    }

    this.tableCache = data as KGTable[]
    this.lastCacheTime = Date.now()
    return this.tableCache
  }

  /**
   * Get all active patterns
   */
  async getPatterns(): Promise<KGQueryPattern[]> {
    if (this.patternCache && this.isCacheValid()) {
      return this.patternCache
    }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('kg_query_patterns')
      .select('*')
      .eq('is_active', true)
      .order('success_count', { ascending: false })

    if (error || !data) {
      console.error('[KG] Error fetching patterns:', error)
      return []
    }

    this.patternCache = data as KGQueryPattern[]
    this.lastCacheTime = Date.now()
    return this.patternCache
  }

  /**
   * Get all active business rules
   */
  async getRules(): Promise<KGBusinessRule[]> {
    if (this.ruleCache && this.isCacheValid()) {
      return this.ruleCache
    }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('kg_business_rules')
      .select('*')
      .eq('is_active', true)

    if (error || !data) {
      console.error('[KG] Error fetching rules:', error)
      return []
    }

    this.ruleCache = data as KGBusinessRule[]
    this.lastCacheTime = Date.now()
    return this.ruleCache
  }

  /**
   * Get a specific pattern by name
   */
  async getPatternByName(name: string): Promise<KGQueryPattern | null> {
    const patterns = await this.getPatterns()
    return patterns.find(p => p.pattern_name === name) || null
  }

  /**
   * Get a specific rule by name
   */
  async getRuleByName(name: string): Promise<KGBusinessRule | null> {
    const rules = await this.getRules()
    return rules.find(r => r.rule_name === name) || null
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const knowledgeGraph = new KnowledgeGraphService()
export default knowledgeGraph
