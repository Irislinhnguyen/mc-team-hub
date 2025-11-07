/**
 * Application Configuration
 * Ported from My-gi-publisher-assistant src/utils/config.py
 */

interface Settings {
  // BigQuery Configuration
  googleCloudProject: string
  bigqueryDataset: string
  bigqueryAiDataset: string

  // Google OAuth
  googleClientId: string
  googleClientSecret: string
  allowedDomain: string
  jwtSecretKey: string

  // Supabase
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey: string

  // OpenAI Configuration
  openaiApiKey: string
  openaiModel: string

  // API Configuration
  apiPort: number
  nodeEnv: string
}

export const settings: Settings = {
  // BigQuery
  googleCloudProject: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT || '',
  bigqueryDataset: process.env.NEXT_PUBLIC_BIGQUERY_DATASET || 'GI_publisher',
  bigqueryAiDataset: process.env.NEXT_PUBLIC_BIGQUERY_AI_DATASET || 'geniee_ai',

  // Google OAuth
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || '',
  allowedDomain: process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || 'geniee.co.jp',
  jwtSecretKey: process.env.JWT_SECRET_KEY || '',

  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',

  // API
  apiPort: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
}

/**
 * Validate that all required settings are configured
 */
export function validateSettings(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!settings.googleCloudProject) {
    errors.push('NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT is not configured')
  }

  if (!settings.googleClientId || !settings.googleClientSecret) {
    errors.push('Google OAuth credentials are not configured')
  }

  if (!settings.jwtSecretKey) {
    errors.push('JWT_SECRET_KEY is not configured')
  }

  if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
    errors.push('Supabase credentials are not configured')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if BigQuery is enabled
 */
export function isBigQueryEnabled(): boolean {
  return !!(settings.googleCloudProject && settings.googleCloudProject !== 'disabled')
}

/**
 * Check if Google OAuth is enabled
 */
export function isGoogleOAuthEnabled(): boolean {
  return !!(settings.googleClientId && settings.googleClientSecret && settings.jwtSecretKey)
}

/**
 * Check if Supabase is enabled
 */
export function isSupabaseEnabled(): boolean {
  return !!(settings.supabaseUrl && settings.supabaseAnonKey)
}

/**
 * Check if OpenAI is enabled
 */
export function isOpenAIEnabled(): boolean {
  return !!(settings.openaiApiKey && settings.openaiApiKey.startsWith('sk-'))
}
