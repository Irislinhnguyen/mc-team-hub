import { NextRequest, NextResponse } from 'next/server'
import BigQueryService from '../../../../../lib/services/bigquery'
import { VALID_COLUMNS } from '../../../../../lib/constants/bigqueryErrors'

/**
 * Schema Inspection API with Caching
 *
 * Fetches table schemas from BigQuery INFORMATION_SCHEMA
 * Uses in-memory cache with 5-minute TTL to reduce BigQuery calls
 */

// In-memory cache
interface SchemaCache {
  data: any
  timestamp: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
let schemaCache: SchemaCache | null = null

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  if (!schemaCache) return false
  return Date.now() - schemaCache.timestamp < CACHE_TTL_MS
}

/**
 * Get cached schema or fetch new
 */
async function getSchemaWithCache(forceRefresh: boolean = false): Promise<any> {
  // Return cached if valid and not forcing refresh
  if (!forceRefresh && isCacheValid() && schemaCache) {
    console.log('[Schema Inspector] Returning cached schema')
    return schemaCache.data
  }

  console.log('[Schema Inspector] Fetching fresh schema from BigQuery...')

  // Get pub_data schema
  const pubDataSchemaQuery = `
    SELECT
      column_name,
      data_type,
      is_nullable
    FROM \`gcpp-check.GI_publisher.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'pub_data'
    ORDER BY ordinal_position
  `

  // Get updated_product_name schema
  const productNameSchemaQuery = `
    SELECT
      column_name,
      data_type,
      is_nullable
    FROM \`gcpp-check.GI_publisher.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'updated_product_name'
    ORDER BY ordinal_position
  `

  // Get sample data to understand relationships
  const pubDataSampleQuery = `
    SELECT *
    FROM \`gcpp-check.GI_publisher.pub_data\`
    LIMIT 5
  `

  const productNameSampleQuery = `
    SELECT *
    FROM \`gcpp-check.GI_publisher.updated_product_name\`
    LIMIT 5
  `

  // Execute all queries
  const [
    pubDataSchema,
    productNameSchema,
    pubDataSample,
    productNameSample
  ] = await Promise.all([
    BigQueryService.executeQuery(pubDataSchemaQuery),
    BigQueryService.executeQuery(productNameSchemaQuery),
    BigQueryService.executeQuery(pubDataSampleQuery),
    BigQueryService.executeQuery(productNameSampleQuery)
  ])

  console.log(`[Schema Inspector] pub_data: ${pubDataSchema.length} columns`)
  console.log(`[Schema Inspector] updated_product_name: ${productNameSchema.length} columns`)

  const data = {
    pub_data: {
      columns: pubDataSchema,
      sampleData: pubDataSample,
      validColumns: VALID_COLUMNS.pub_data
    },
    updated_product_name: {
      columns: productNameSchema,
      sampleData: productNameSample,
      validColumns: VALID_COLUMNS.updated_product_name
    }
  }

  // Update cache
  schemaCache = {
    data,
    timestamp: Date.now()
  }

  return data
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    const quickLookup = searchParams.get('quick') === 'true'

    // Quick lookup - return just valid columns without fetching from BigQuery
    if (quickLookup) {
      console.log('[Schema Inspector] Quick lookup - returning hardcoded columns')
      return NextResponse.json({
        status: 'success',
        quick: true,
        validColumns: VALID_COLUMNS,
        tables: {
          pub_data: {
            fullName: 'gcpp-check.GI_publisher.pub_data',
            columns: VALID_COLUMNS.pub_data,
            description: 'Main publisher data with daily metrics'
          },
          updated_product_name: {
            fullName: 'gcpp-check.GI_publisher.updated_product_name',
            columns: VALID_COLUMNS.updated_product_name,
            description: 'Product/H5 classification mapping'
          }
        },
        commonJoins: [
          {
            description: 'Join pub_data with product info',
            sql: 'LEFT JOIN `gcpp-check.GI_publisher.updated_product_name` u ON p.pid = u.pid AND p.mid = u.mid AND p.zid = u.zid'
          }
        ],
        cacheInfo: {
          cached: isCacheValid(),
          cacheAge: schemaCache ? Math.round((Date.now() - schemaCache.timestamp) / 1000) : null
        }
      })
    }

    // Full schema fetch
    const schemas = await getSchemaWithCache(forceRefresh)

    return NextResponse.json({
      status: 'success',
      schemas,
      cacheInfo: {
        cached: !forceRefresh && isCacheValid(),
        cacheAge: schemaCache ? Math.round((Date.now() - schemaCache.timestamp) / 1000) : 0,
        ttlSeconds: Math.round(CACHE_TTL_MS / 1000)
      }
    })

  } catch (error: any) {
    console.error('[Schema Inspector] Error:', error)

    // On error, still return hardcoded valid columns so AI can work
    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to fetch schemas',
        // Fallback to hardcoded columns
        fallback: {
          validColumns: VALID_COLUMNS,
          message: 'Using hardcoded column list due to fetch error'
        },
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for AI to verify columns
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { columns, table } = body

    if (!columns || !Array.isArray(columns)) {
      return NextResponse.json(
        { status: 'error', error: 'columns array is required' },
        { status: 400 }
      )
    }

    const tableName = table || 'pub_data'
    const validCols = VALID_COLUMNS[tableName as keyof typeof VALID_COLUMNS] || []

    const validationResults = columns.map(col => {
      const colLower = col.toLowerCase()
      const isValid = validCols.some(v => v.toLowerCase() === colLower)

      // Suggest fix if invalid
      let suggestion: string | null = null
      if (!isValid) {
        // Check for common typos
        const fixes: Record<string, string> = {
          'mname': 'medianame',
          'pname': 'pubname',
          'zname': 'zonename',
          'revenue': 'rev',
          'impressions': 'req',
          'requests': 'req',
          'team': 'pic',
          'quarter': 'CEIL(month / 3)'
        }
        suggestion = fixes[colLower] || null

        // Try fuzzy match
        if (!suggestion) {
          const closest = validCols.find(v =>
            v.toLowerCase().includes(colLower) ||
            colLower.includes(v.toLowerCase())
          )
          if (closest) suggestion = closest
        }
      }

      return {
        column: col,
        valid: isValid,
        suggestion
      }
    })

    const allValid = validationResults.every(r => r.valid)

    return NextResponse.json({
      status: 'success',
      table: tableName,
      allValid,
      results: validationResults
    })

  } catch (error: any) {
    console.error('[Schema Inspector] POST Error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to validate columns'
      },
      { status: 500 }
    )
  }
}

// Support OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 })
}
