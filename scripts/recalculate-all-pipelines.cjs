#!/usr/bin/env node
/**
 * Recalculate ALL pipelines revenue (q_gross, q_net_rev)
 * and update pipeline_monthly_forecast table
 *
 * This fixes the issue where:
 * - gross_revenue and net_revenue in monthly_forecast are NULL
 * - delivery_days are 0 or incorrect
 * - q_gross and q_net_rev don't match SUM of monthly forecast
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Status to Progress % mapping (Google Sheet VLOOKUP logic)
 */
const STATUS_PROGRESS_MAP = {
  '【S】': 100,
  '【S-】': 100,
  '【A】': 80,
  '【B】': 60,
  '【C+】': 50,
  '【C】': 30,
  '【C-】': 5,
  '【D】': 100,
  '【E】': 0,
}

/**
 * Get progress percent from status (like Google Sheet VLOOKUP)
 */
function getProgressFromStatus(status) {
  return STATUS_PROGRESS_MAP[status] ?? 50 // Default 50% if unknown
}

/**
 * Calculate delivery days for a given month
 * Replicates Google Sheet formula
 */
function calculateDeliveryDays(startingDate, year, month) {
  if (!startingDate) return 30 // Default to 30 if no starting date

  const start = new Date(startingDate)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0) // Last day of month

  // If starting date is after month end, return 0
  if (start > monthEnd) return 0

  // If starting date is before month start, return full month days
  if (start <= monthStart) {
    return monthEnd.getDate()
  }

  // Starting date is within the month
  return monthEnd.getDate() - start.getDate() + 1
}

/**
 * Get quarterly months based on fiscal year
 * Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
 */
function getQuarterlyMonths() {
  const today = new Date()
  const currentMonth = today.getMonth() + 1 // 1-12
  const currentYear = today.getFullYear()

  // Determine fiscal month (Apr=1, May=2, ..., Mar=12)
  const fiscalMonth = currentMonth >= 4 ? currentMonth : currentMonth + 12

  // Calculate quarter start month (4, 7, 10, or 13)
  const quarterStartMonth = Math.floor((fiscalMonth - 4) / 3) * 3 + 4

  // Generate 3 months
  const months = []
  for (let i = 0; i < 3; i++) {
    let targetMonth = quarterStartMonth + i
    let targetYear = currentYear

    // Handle Q4 (Jan-Mar) which crosses year boundary
    if (targetMonth > 12) {
      targetMonth -= 12
      targetYear += 1
    }

    months.push({ year: targetYear, month: targetMonth })
  }

  return months
}

async function recalculateAllPipelines() {
  console.log('🔄 Fetching all pipelines...')

  // Fetch ALL pipelines (remove default 1000 limit)
  let allPipelines = []
  let hasMore = true
  let offset = 0
  const batchSize = 1000

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('pipelines')
      .select('id, publisher, status, progress_percent, day_gross, day_net_rev, starting_date, max_gross, revenue_share')
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1)

    if (error) {
      console.error('❌ Error fetching pipelines:', error)
      return
    }

    if (batch && batch.length > 0) {
      allPipelines = allPipelines.concat(batch)
      offset += batchSize
      hasMore = batch.length === batchSize
    } else {
      hasMore = false
    }
  }

  const pipelines = allPipelines

  console.log(`📊 Found ${pipelines.length} pipelines`)

  let updated = 0
  let errors = 0

  const ZERO_REVENUE_STATUSES = ['【D】', '【E】', '【F】']

  for (const pipeline of pipelines) {
    try {
      const isZeroRevenue = ZERO_REVENUE_STATUSES.includes(pipeline.status)
      // Get progress from status using VLOOKUP logic (like Google Sheet)
      const progressPercent = getProgressFromStatus(pipeline.status)
      const progressMultiplier = progressPercent / 100

      // Get quarterly months
      const months = getQuarterlyMonths()

      // Calculate monthly forecasts
      const monthlyForecasts = []
      let qGross = 0
      let qNet = 0

      for (const { year, month } of months) {
        const deliveryDays = calculateDeliveryDays(pipeline.starting_date, year, month)

        let grossRevenue = 0
        let netRevenue = 0

        if (!isZeroRevenue && pipeline.day_gross && pipeline.day_net_rev) {
          grossRevenue = pipeline.day_gross * progressMultiplier * deliveryDays
          netRevenue = pipeline.day_net_rev * progressMultiplier * deliveryDays
        }

        qGross += grossRevenue
        qNet += netRevenue

        monthlyForecasts.push({
          year,
          month,
          delivery_days: deliveryDays,
          gross_revenue: Math.round(grossRevenue * 100) / 100,
          net_revenue: Math.round(netRevenue * 100) / 100,
        })
      }

      // Update pipelines table with new q_gross, q_net_rev, and progress_percent
      const { error: updateError } = await supabase
        .from('pipelines')
        .update({
          q_gross: Math.round(qGross * 100) / 100,
          q_net_rev: Math.round(qNet * 100) / 100,
          progress_percent: progressPercent, // Sync progress from status
        })
        .eq('id', pipeline.id)

      if (updateError) {
        console.error(`❌ Error updating pipeline ${pipeline.publisher}:`, updateError)
        errors++
        continue
      }

      // Delete old monthly forecasts
      await supabase
        .from('pipeline_monthly_forecast')
        .delete()
        .eq('pipeline_id', pipeline.id)

      // Insert new monthly forecasts
      const { error: forecastError } = await supabase
        .from('pipeline_monthly_forecast')
        .insert(
          monthlyForecasts.map((f) => ({
            pipeline_id: pipeline.id,
            year: f.year,
            month: f.month,
            delivery_days: f.delivery_days,
            gross_revenue: f.gross_revenue,
            net_revenue: f.net_revenue,
          }))
        )

      if (forecastError) {
        console.error(`❌ Error inserting forecast for ${pipeline.publisher}:`, forecastError)
        errors++
        continue
      }

      updated++
      if (updated % 100 === 0) {
        console.log(`✅ Updated ${updated}/${pipelines.length} pipelines...`)
      }
    } catch (err) {
      console.error(`❌ Error processing ${pipeline.publisher}:`, err)
      errors++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`✅ Successfully updated: ${updated}`)
  console.log(`❌ Errors: ${errors}`)
  console.log(`📈 Total processed: ${pipelines.length}`)
}

recalculateAllPipelines()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
  })
