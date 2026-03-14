/**
 * Google Sheets Client Service
 * Centralized Google Sheets authentication with robust credential parsing
 * Follows the same pattern as BigQuery service for consistency
 */

import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { join } from 'path'

class GoogleSheetsService {
  private static instance: google.auth.GoogleAuth | null = null
  private static currentScopes: string[] = []

  /**
   * Get or create Google Sheets auth client (Singleton pattern)
   * @param scopes - OAuth2 scopes (default: spreadsheets)
   */
  static getInstance(scopes?: string[]): google.auth.GoogleAuth {
    const requestedScopes = scopes || ['https://www.googleapis.com/auth/spreadsheets']

    // Reset instance if scopes changed
    const scopesChanged = !this.instance ||
      JSON.stringify(this.currentScopes.sort()) !== JSON.stringify(requestedScopes.sort())

    if (scopesChanged && this.instance) {
      console.log('[Google Sheets] Scopes changed, resetting client')
      this.instance = null
    }

    if (!this.instance) {
      try {
        const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
        const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64
        const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

        // Try to get credentials from various sources
        let credentials
        let source = ''

        // Priority 1: Base64 encoded (recommended for Vercel)
        if (credentialsBase64) {
          const decoded = Buffer.from(credentialsBase64, 'base64').toString('utf-8')
          credentials = JSON.parse(decoded)
          source = 'GOOGLE_APPLICATION_CREDENTIALS_BASE64'
        }
        // Priority 2: Inline JSON
        else if (credentialsJson) {
          credentials = JSON.parse(credentialsJson)
          source = 'GOOGLE_APPLICATION_CREDENTIALS_JSON'
        }
        // Priority 3: File path (for local development)
        else if (credentialsPath) {
          const filePath = credentialsPath.startsWith('./') || credentialsPath.startsWith('../')
            ? join(process.cwd(), credentialsPath)
            : credentialsPath
          const fileContent = readFileSync(filePath, 'utf-8')
          credentials = JSON.parse(fileContent)
          source = `GOOGLE_APPLICATION_CREDENTIALS (file: ${credentialsPath})`
        }
        else {
          throw new Error('Either GOOGLE_APPLICATION_CREDENTIALS_JSON, GOOGLE_APPLICATION_CREDENTIALS_BASE64, or GOOGLE_APPLICATION_CREDENTIALS must be set')
        }

        if (!credentials) {
          throw new Error('Either GOOGLE_APPLICATION_CREDENTIALS_JSON, GOOGLE_APPLICATION_CREDENTIALS_BASE64, or GOOGLE_APPLICATION_CREDENTIALS must be set')
        }

        // 🔥 FIX: Handle multiple private key encoding scenarios (copied from BigQuery)
        if (credentials.private_key) {
          let privateKey = credentials.private_key

          // Case 1: Double-escaped newlines (\\n -> \n)
          if (privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n')
          }

          // Case 2: Missing newlines in key blocks
          // Ensure proper PEM format with newlines after header/footer
          if (!privateKey.includes('\n')) {
            console.warn('[Google Sheets] ⚠️ Private key appears to be on a single line - attempting to fix...')

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
          console.log('[Google Sheets] Private key format check:')
          console.log('  Start:', privateKey.substring(0, 50))
          console.log('  End:', privateKey.substring(privateKey.length - 50))
        }

        this.instance = new google.auth.GoogleAuth({
          credentials,
          scopes: requestedScopes,
        })

        this.currentScopes = requestedScopes

        console.log(`[Google Sheets] Client initialized with scopes: ${requestedScopes.join(', ')}`)
        console.log(`[Google Sheets] Service account: ${credentials.client_email}`)
      } catch (error) {
        console.error('[Google Sheets] Failed to initialize client:', error)

        // Provide specific error messages
        if (error instanceof Error) {
          if (error.message.includes('DECODER routines')) {
            console.error('[Google Sheets] 💥 OpenSSL decoder error - private key format is invalid')
            console.error('[Google Sheets] 🔍 Troubleshooting steps:')
            console.error('   1. Verify GOOGLE_APPLICATION_CREDENTIALS_JSON has valid JSON format')
            console.error('   2. Check that private_key field starts with "-----BEGIN PRIVATE KEY-----"')
            console.error('   3. Ensure newlines in private key are properly escaped as \\n in .env file')
            console.error('   4. Try using GOOGLE_APPLICATION_CREDENTIALS_BASE64 instead')
            console.error('   5. Try regenerating service account key from Google Cloud Console')
          } else if (error.message.includes('Bad control character')) {
            console.error('[Google Sheets] 💥 JSON parsing failed - likely newline encoding issue')
            console.error('[Google Sheets] 🔍 Solution: Use GOOGLE_APPLICATION_CREDENTIALS_BASE64 instead')
          }
        }

        throw error
      }
    }

    return this.instance
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    this.instance = null
    this.currentScopes = []
  }
}

/**
 * Helper function to get Google Sheets auth client
 * Use this instead of creating new google.auth.GoogleAuth() to ensure singleton pattern
 * and avoid parsing credentials at top-level (which causes Vercel build errors)
 *
 * @param scopes - OAuth2 scopes (default: spreadsheets read/write)
 * @returns GoogleAuth instance
 *
 * @example
 * // For read/write access
 * const auth = getSheetsClient(['https://www.googleapis.com/auth/spreadsheets'])
 *
 * // For read-only access
 * const auth = getSheetsClient(['https://www.googleapis.com/auth/spreadsheets.readonly'])
 */
export function getSheetsClient(scopes?: string[]): google.auth.GoogleAuth {
  return GoogleSheetsService.getInstance(scopes)
}

/**
 * Reset the Google Sheets client (for testing)
 */
export function resetSheetsClient(): void {
  GoogleSheetsService.resetInstance()
}
