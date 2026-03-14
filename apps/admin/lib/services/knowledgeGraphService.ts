/**
 * @deprecated This file is DEPRECATED. Use knowledgeGraphSupabase.ts instead.
 *
 * Knowledge Graph Service (Neo4j-based) - DEPRECATED
 *
 * Neo4j Aura Free tier was too unstable (72h auto-pause, connection timeouts).
 *
 * REPLACEMENT:
 * - For Knowledge Graph: Use lib/services/knowledgeGraphSupabase.ts
 * - For learning/feedback: Use lib/services/feedbackLearningService.ts
 *
 * Both replacements use Supabase instead of Neo4j.
 *
 * This file is kept for reference but is NO LONGER USED.
 * Safe to delete after confirming all imports are removed.
 */

import neo4jService from './neo4jService'

/**
 * Check if Neo4j is available before making calls
 * Returns false if circuit breaker is open
 */
function isNeo4jAvailable(): boolean {
  return neo4jService.isAvailable()
}

export interface ConstraintInfo {
  rule: string
  description: string
  sqlPattern: string
  correctPattern: string
  severity: string
}

export interface QueryPatternInfo {
  name: string
  description: string
  sqlTemplate: string
  example: string
  successRate: number
}

export interface ErrorCaseInfo {
  errorMessage: string
  errorType: string
  question: string
  wrongSql: string
  correctSql?: string
  solution?: string
}

export interface TableInfo {
  name: string
  fullName: string
  type: string
  description: string
  columns: Array<{
    name: string
    dataType: string
    isNullable: boolean
    description: string
  }>
}

class KnowledgeGraphService {
  /**
   * Get all active constraints for a specific table
   */
  async getConstraintsForTable(tableName: string): Promise<ConstraintInfo[]> {
    // Skip if Neo4j is not available
    if (!isNeo4jAvailable()) {
      return []
    }

    const result = await neo4jService.query<any>(`
      MATCH (c:Constraint)-[:APPLIES_TO]->(t:Table {name: $tableName})
      RETURN c.rule as rule,
             c.description as description,
             c.sqlPattern as sqlPattern,
             c.correctPattern as correctPattern,
             c.severity as severity
      ORDER BY c.severity DESC
    `, { tableName })

    return result.map(r => ({
      rule: r.rule,
      description: r.description,
      sqlPattern: r.sqlPattern,
      correctPattern: r.correctPattern,
      severity: r.severity
    }))
  }

  /**
   * Get all constraints (regardless of table)
   */
  async getAllConstraints(): Promise<ConstraintInfo[]> {
    // Skip if Neo4j is not available
    if (!isNeo4jAvailable()) {
      return []
    }

    const result = await neo4jService.query<any>(`
      MATCH (c:Constraint)
      RETURN c.rule as rule,
             c.description as description,
             c.sqlPattern as sqlPattern,
             c.correctPattern as correctPattern,
             c.severity as severity
      ORDER BY c.severity DESC
    `)

    return result.map(r => ({
      rule: r.rule,
      description: r.description,
      sqlPattern: r.sqlPattern,
      correctPattern: r.correctPattern,
      severity: r.severity
    }))
  }

  /**
   * Get relevant query patterns based on keywords
   */
  async getRelevantPatterns(keywords: string[]): Promise<QueryPatternInfo[]> {
    // Skip if Neo4j is not available
    if (!isNeo4jAvailable()) {
      return []
    }

    const patterns: QueryPatternInfo[] = []

    for (const keyword of keywords) {
      const result = await neo4jService.query<any>(`
        MATCH (p:QueryPattern)
        WHERE toLower(p.name) CONTAINS toLower($keyword)
           OR toLower(p.description) CONTAINS toLower($keyword)
        RETURN p.name as name,
               p.description as description,
               p.sqlTemplate as sqlTemplate,
               p.example as example,
               p.successRate as successRate
        ORDER BY p.successRate DESC, p.useCount DESC
        LIMIT 3
      `, { keyword })

      patterns.push(...result.map(r => ({
        name: r.name,
        description: r.description,
        sqlTemplate: r.sqlTemplate,
        example: r.example,
        successRate: r.successRate
      })))
    }

    // Remove duplicates
    const uniquePatterns = Array.from(
      new Map(patterns.map(p => [p.name, p])).values()
    )

    return uniquePatterns
  }

  /**
   * Get table schema with JOIN information
   */
  async getTableSchema(tableName: string): Promise<TableInfo | null> {
    // Skip if Neo4j is not available
    if (!isNeo4jAvailable()) {
      return null
    }

    const result = await neo4jService.query<any>(`
      MATCH (t:Table {name: $tableName})
      OPTIONAL MATCH (t)-[r:HAS_COLUMN]->(c:Column)
      RETURN t.name as name,
             t.fullName as fullName,
             t.type as type,
             t.description as description,
             collect({
               name: c.name,
               dataType: c.dataType,
               isNullable: c.isNullable,
               description: c.description
             }) as columns
    `, { tableName })

    if (result.length === 0) return null

    const row = result[0]
    return {
      name: row.name,
      fullName: row.fullName,
      type: row.type,
      description: row.description,
      columns: row.columns.filter((c: any) => c.name) // Filter out null columns
    }
  }

  /**
   * Get JOIN information between tables
   */
  async getJoinInfo(fromTable: string, toTable: string): Promise<string | null> {
    // Skip if Neo4j is not available
    if (!isNeo4jAvailable()) {
      return null
    }

    const result = await neo4jService.query<any>(`
      MATCH (from:Table {name: $fromTable})-[r:JOINS_WITH]->(to:Table {name: $toTable})
      RETURN r.joinType as joinType, r.onCondition as onCondition
    `, { fromTable, toTable })

    if (result.length === 0) return null

    const { joinType, onCondition } = result[0]
    return `${joinType} JOIN ${toTable} ON ${onCondition}`
  }

  /**
   * Find similar past errors
   */
  async findSimilarErrors(errorMessage: string, limit: number = 3): Promise<ErrorCaseInfo[]> {
    // Skip if Neo4j is not available
    if (!isNeo4jAvailable()) {
      return []
    }

    const result = await neo4jService.query<any>(`
      MATCH (e:ErrorCase)
      WHERE toLower(e.errorMessage) CONTAINS toLower($searchTerm)
         OR toLower(e.errorType) CONTAINS toLower($searchTerm)
      RETURN e.errorMessage as errorMessage,
             e.errorType as errorType,
             e.question as question,
             e.wrongSql as wrongSql,
             e.correctSql as correctSql,
             e.solution as solution
      ORDER BY e.occurrences DESC
      LIMIT $limit
    `, { searchTerm: errorMessage.substring(0, 50), limit })

    return result.map(r => ({
      errorMessage: r.errorMessage,
      errorType: r.errorType,
      question: r.question,
      wrongSql: r.wrongSql,
      correctSql: r.correctSql,
      solution: r.solution
    }))
  }

  /**
   * Calculate confidence score based on pattern matching
   */
  async calculatePatternConfidence(patterns: string[]): Promise<number> {
    if (patterns.length === 0) return 0.5 // No patterns matched = low confidence

    // Skip if Neo4j is not available
    if (!isNeo4jAvailable()) {
      return 0.5 // Default confidence when Neo4j unavailable
    }

    const result = await neo4jService.query<any>(`
      UNWIND $patterns as patternName
      MATCH (p:QueryPattern {name: patternName})
      RETURN avg(p.successRate) as avgSuccess, count(p) as matchedCount
    `, { patterns })

    if (result.length === 0 || result[0].matchedCount === 0) {
      return 0.5 // Patterns not found in graph
    }

    const avgSuccess = result[0].avgSuccess || 0.5
    const coverage = result[0].matchedCount / patterns.length

    // Confidence = 70% success rate + 30% pattern coverage
    return avgSuccess * 0.7 + coverage * 0.3
  }

  /**
   * Store a successful query for learning (only if confidence is low)
   */
  async storeSuccessfulQuery(question: string, sql: string, executionTime: number) {
    // Skip if Neo4j is not available
    if (!isNeo4jAvailable()) {
      return
    }

    // Extract patterns from the question
    const patterns = this.extractPatterns(question)

    // Calculate confidence
    const confidence = await this.calculatePatternConfidence(patterns)

    // Only store if confidence is low (learning opportunity) OR if patterns exist
    // Skip storing routine high-confidence queries to save nodes
    if (confidence < 0.8 || patterns.length > 0) {
      // Update pattern usage counts
      for (const patternName of patterns) {
        await neo4jService.write(`
          MATCH (p:QueryPattern {name: $patternName})
          SET p.useCount = p.useCount + 1,
              p.lastUsed = datetime()
        `, { patternName })
      }

      console.log(`[KG] Recorded query (confidence: ${confidence.toFixed(2)}) using patterns: ${patterns.join(', ')}`)
    } else {
      console.log(`[KG] Skipped storing high-confidence query (${confidence.toFixed(2)})`)
    }
  }

  /**
   * Generate error signature (fingerprint) for grouping similar errors
   */
  private generateErrorSignature(errorMessage: string, errorType: string): string {
    // Extract first 100 chars and normalize
    const normalized = errorMessage
      .substring(0, 100)
      .replace(/[^a-zA-Z0-9\s]/g, '_') // Replace special chars
      .replace(/\s+/g, '_') // Replace spaces
      .replace(/_+/g, '_') // Collapse multiple underscores
      .toLowerCase()

    return `${errorType}_${normalized}`
  }

  /**
   * Store an error case for learning (with fingerprinting to reduce node count)
   */
  async storeErrorCase(
    question: string,
    wrongSql: string,
    errorMessage: string,
    errorType: 'syntax' | 'semantic' | 'data',
    correctSql?: string,
    solution?: string
  ) {
    // Skip if Neo4j is not available
    if (!isNeo4jAvailable()) {
      return
    }

    // Generate error signature for grouping similar errors
    const signature = this.generateErrorSignature(errorMessage, errorType)

    // MERGE by signature instead of exact match (reduces nodes by 80-90%)
    const result = await neo4jService.write<any>(`
      MERGE (e:ErrorCase {signature: $signature})
      ON CREATE SET
        e.errorType = $errorType,
        e.firstSeen = datetime(),
        e.lastSeen = datetime(),
        e.occurrences = 1,
        e.exampleMessage = $errorMessage,
        e.exampleQuestion = $question,
        e.exampleWrongSql = $wrongSql,
        e.correctSql = $correctSql,
        e.solution = $solution
      ON MATCH SET
        e.occurrences = e.occurrences + 1,
        e.lastSeen = datetime(),
        e.latestMessage = $errorMessage,
        e.latestQuestion = $question,
        e.correctSql = COALESCE($correctSql, e.correctSql),
        e.solution = COALESCE($solution, e.solution)
      RETURN e.occurrences as count
    `, {
      signature,
      errorType,
      errorMessage,
      question,
      wrongSql,
      correctSql: correctSql || null,
      solution: solution || null
    })

    const count = result[0]?.count || 1
    console.log(`[KG] Error signature '${signature.substring(0, 50)}...': ${count} occurrence(s)`)
  }

  /**
   * Get context for AI prompt
   */
  async getContextForQuestion(question: string): Promise<string> {
    // Skip if Neo4j is not available (circuit breaker open)
    if (!isNeo4jAvailable()) {
      return '' // Return empty context silently
    }

    const keywords = this.extractKeywords(question)
    const patterns = await this.getRelevantPatterns(keywords)
    const constraints = await this.getAllConstraints()

    // If no data retrieved, return empty (Neo4j might be having issues)
    if (patterns.length === 0 && constraints.length === 0) {
      return ''
    }

    let context = '\n\n=== KNOWLEDGE GRAPH CONTEXT ===\n'

    // Add relevant constraints
    if (constraints.length > 0) {
      context += '\nIMPORTANT SQL CONSTRAINTS:\n'
      constraints.forEach(c => {
        context += `- [${c.severity.toUpperCase()}] ${c.description}\n`
        context += `  WRONG: ${c.sqlPattern}\n`
        context += `  RIGHT: ${c.correctPattern}\n\n`
      })
    }

    // Add relevant patterns
    if (patterns.length > 0) {
      context += '\nRELEVANT QUERY PATTERNS:\n'
      patterns.forEach(p => {
        context += `- ${p.name}: ${p.description}\n`
        context += `  Template: ${p.sqlTemplate}\n`
        context += `  Example: ${p.example}\n`
        context += `  Success Rate: ${(p.successRate * 100).toFixed(0)}%\n\n`
      })
    }

    return context
  }

  /**
   * Extract keywords from question
   */
  private extractKeywords(question: string): string[] {
    const keywords: string[] = []

    const lowerQuestion = question.toLowerCase()

    // Time-related keywords
    if (lowerQuestion.includes('month') || lowerQuestion.includes('tháng')) {
      keywords.push('time_range')
      keywords.push('monthly')
    }

    // Product-related keywords
    if (lowerQuestion.includes('product') || lowerQuestion.includes('sản phẩm')) {
      keywords.push('product')
    }

    // Team-related keywords
    if (lowerQuestion.includes('team') || lowerQuestion.includes('nhóm')) {
      keywords.push('team')
    }

    // Top N keywords
    if (lowerQuestion.includes('top') || lowerQuestion.includes('lớn nhất') || lowerQuestion.includes('cao nhất')) {
      keywords.push('top')
      keywords.push('revenue')
    }

    return keywords
  }

  /**
   * Extract pattern names from question
   */
  private extractPatterns(question: string): string[] {
    const patterns: string[] = []
    const lowerQuestion = question.toLowerCase()

    if (lowerQuestion.includes('product') || lowerQuestion.includes('sản phẩm')) {
      patterns.push('product_filter')
    }

    if (lowerQuestion.includes('team') || lowerQuestion.includes('nhóm')) {
      patterns.push('team_filter')
    }

    if (lowerQuestion.includes('month') || lowerQuestion.includes('tháng')) {
      patterns.push('monthly_aggregation')
    }

    if (lowerQuestion.includes('last') || lowerQuestion.includes('recent') || lowerQuestion.includes('gần đây')) {
      patterns.push('time_range_recent')
    }

    if (lowerQuestion.includes('top') || lowerQuestion.includes('lớn nhất')) {
      patterns.push('top_n_by_revenue')
    }

    return patterns
  }

  /**
   * Get PICs for a team from Knowledge Graph
   */
  async getPicsForTeam(teamId: string): Promise<string[]> {
    // Skip if Neo4j is not available
    if (!isNeo4jAvailable()) {
      return []
    }

    const result = await neo4jService.query<any>(`
      MATCH (t:Team {teamId: $teamId})-[:HAS_PIC]->(p:PIC)
      WHERE p.isActive = true
      RETURN p.picId as picId
    `, { teamId })

    return result.map(r => r.picId)
  }
}

export default new KnowledgeGraphService()
