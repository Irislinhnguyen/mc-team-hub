/**
 * BigQuery Service
 * Ported from My-gi-publisher-assistant src/services/bigquery_service.py
 * Singleton pattern for BigQuery client management
 */

import { BigQuery } from '@google-cloud/bigquery'
import { settings, isBigQueryEnabled } from '../utils/config'

class BigQueryService {
  private static instance: BigQuery | null = null
  private project: string
  private dataset: string
  private aiDataset: string

  constructor() {
    this.project = settings.googleCloudProject
    this.dataset = settings.bigqueryDataset
    this.aiDataset = settings.bigqueryAiDataset
  }

  /**
   * Get or create BigQuery client (Singleton pattern)
   */
  static getInstance(): BigQuery {
    if (!this.instance) {
      if (!isBigQueryEnabled()) {
        throw new Error('BigQuery is not enabled. Check your environment configuration.')
      }

      const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

      if (!credentialsJson) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not set')
      }

      try {
        const credentials = JSON.parse(credentialsJson)

        this.instance = new BigQuery({
          projectId: settings.googleCloudProject,
          credentials,
        })

        console.log(`[BigQuery] Client initialized for project: ${settings.googleCloudProject}`)
      } catch (error) {
        console.error('[BigQuery] Failed to initialize client:', error)
        throw error
      }
    }

    return this.instance
  }

  /**
   * Execute a BigQuery SQL query
   */
  static async executeQuery(query: string, parameters?: any[]): Promise<any[]> {
    try {
      const client = this.getInstance()

      console.log(`[BigQuery] Executing query on ${settings.googleCloudProject}.${settings.bigqueryDataset}`)
      console.log(`[BigQuery] Full Query:\n${query}`)

      const jobConfig = {
        query,
        location: 'US',
      }

      const [rows] = await client.query(jobConfig)

      console.log(`[BigQuery] Query executed successfully. Returned ${rows.length} rows`)

      // Unwrap BigQuery special types (DATE, DATETIME, TIMESTAMP)
      const unwrappedRows = rows.map(row => this.unwrapBigQueryTypes(row))

      return unwrappedRows
    } catch (error) {
      console.error('[BigQuery] Query execution failed:', error)
      throw new Error(`BigQuery execution failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Unwrap BigQuery special types (DATE, DATETIME, TIMESTAMP)
   * These are returned as objects with a 'value' property
   */
  private static unwrapBigQueryTypes(obj: any): any {
    if (obj === null || obj === undefined) return obj

    // Check if this is a BigQuery special type (has only 'value' property)
    if (typeof obj === 'object' && 'value' in obj && Object.keys(obj).length === 1) {
      return obj.value
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.unwrapBigQueryTypes(item))
    }

    // Handle nested objects
    if (typeof obj === 'object') {
      const unwrapped: any = {}
      for (const [key, value] of Object.entries(obj)) {
        unwrapped[key] = this.unwrapBigQueryTypes(value)
      }
      return unwrapped
    }

    return obj
  }

  /**
   * Test BigQuery connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const client = this.getInstance()
      const [rows] = await client.query('SELECT 1 as test')

      console.log('[BigQuery] Connection test successful')
      return true
    } catch (error) {
      console.error('[BigQuery] Connection test failed:', error)
      return false
    }
  }

  /**
   * Get table information
   */
  static async getTableInfo(tableName: string): Promise<{
    project: string
    dataset: string
    table: string
    numRows: number
    numBytes: number
    schema: Array<{ name: string; type: string }>
  }> {
    try {
      const client = this.getInstance()
      const tableRef = `${settings.googleCloudProject}.${settings.bigqueryDataset}.${tableName}`

      console.log(`[BigQuery] Getting table info: ${tableRef}`)

      const table = client.dataset(settings.bigqueryDataset).table(tableName)
      const [metadata] = await table.getMetadata()

      return {
        project: settings.googleCloudProject,
        dataset: settings.bigqueryDataset,
        table: tableName,
        numRows: parseInt(metadata.numRows || '0'),
        numBytes: parseInt(metadata.numBytes || '0'),
        schema: (metadata.schema?.fields || []).map((field: any) => ({
          name: field.name,
          type: field.type,
        })),
      }
    } catch (error) {
      console.error('[BigQuery] Failed to get table info:', error)
      throw new Error(`Failed to get table info: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get all tables in the dataset
   */
  static async listTables(): Promise<Array<{ name: string; type: string }>> {
    try {
      const client = this.getInstance()
      const dataset = client.dataset(settings.bigqueryDataset)

      const [tables] = await dataset.getTables()

      return tables.map((table) => ({
        name: table.id || '',
        type: 'TABLE',
      }))
    } catch (error) {
      console.error('[BigQuery] Failed to list tables:', error)
      throw new Error(`Failed to list tables: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export default BigQueryService
