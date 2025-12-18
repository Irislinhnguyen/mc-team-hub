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
      const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64

      if (!credentialsJson && !credentialsBase64) {
        throw new Error('Either GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS_BASE64 must be set')
      }

      try {
        // Parse credentials from either JSON or base64
        let credentials
        if (credentialsBase64) {
          // Decode from base64 (preferred for Vercel to avoid newline issues)
          const decoded = Buffer.from(credentialsBase64, 'base64').toString('utf-8')
          credentials = JSON.parse(decoded)
        } else {
          // Parse from JSON string (fallback)
          credentials = JSON.parse(credentialsJson!)
        }

        // 🔥 FIX: Handle multiple private key encoding scenarios
        if (credentials.private_key) {
          let privateKey = credentials.private_key

          // Case 1: Double-escaped newlines (\\n -> \n)
          if (privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n')
          }

          // Case 2: Missing newlines in key blocks
          // Ensure proper PEM format with newlines after header/footer
          if (!privateKey.includes('\n')) {
            // If there are no newlines at all, the key is likely malformed
            console.warn('[BigQuery] ⚠️ Private key appears to be on a single line - attempting to fix...')

            // Add newlines after BEGIN/END markers
            privateKey = privateKey
              .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
              .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')

            // Add newlines every 64 characters in the key body (standard PEM line length)
            const beginMarker = '-----BEGIN PRIVATE KEY-----\n'
            const endMarker = '\n-----END PRIVATE KEY-----'
            const beginIndex = privateKey.indexOf(beginMarker)
            const endIndex = privateKey.indexOf(endMarker)

            if (beginIndex !== -1 && endIndex !== -1) {
              const keyBody = privateKey.substring(beginIndex + beginMarker.length, endIndex)
              const formattedBody = keyBody.match(/.{1,64}/g)?.join('\n') || keyBody
              privateKey = beginMarker + formattedBody + endMarker
            }
          }

          // Case 3: URL-encoded newlines (%0A -> \n)
          if (privateKey.includes('%0A')) {
            privateKey = decodeURIComponent(privateKey)
          }

          credentials.private_key = privateKey

          // Debug: Log first/last 50 chars to verify format without exposing full key
          console.log('[BigQuery] Private key format check:')
          console.log('  Start:', privateKey.substring(0, 50))
          console.log('  End:', privateKey.substring(privateKey.length - 50))
        }

        this.instance = new BigQuery({
          projectId: settings.googleCloudProject,
          credentials,
        })

        console.log(`[BigQuery] Client initialized for project: ${settings.googleCloudProject}`)
      } catch (error) {
        console.error('[BigQuery] Failed to initialize client:', error)

        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes('DECODER routines')) {
            console.error('[BigQuery] 💥 OpenSSL decoder error - private key format is invalid')
            console.error('[BigQuery] 🔍 Troubleshooting steps:')
            console.error('   1. Verify GOOGLE_APPLICATION_CREDENTIALS_JSON has valid JSON format')
            console.error('   2. Check that private_key field starts with "-----BEGIN PRIVATE KEY-----"')
            console.error('   3. Ensure newlines in private key are properly escaped as \\n in .env file')
            console.error('   4. Try regenerating service account key from Google Cloud Console')
          }
        }

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
