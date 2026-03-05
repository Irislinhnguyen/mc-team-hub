# Top 200 Publishers Query

## Files Created

1. **`scripts/bigquery-top-200-publishers.sql`** - SQL query file
   - Can be run directly in BigQuery console
   - Or use with any BigQuery client

2. **`scripts/query-top-200-publishers.mts`** - Node.js script
   - Executes query and exports to CSV
   - Uses TypeScript with tsx

## Usage

### Option 1: Run in BigQuery Console
1. Open BigQuery Console: https://console.cloud.google.com/bigquery
2. Copy contents of `scripts/bigquery-top-200-publishers.sql`
3. Paste and run

### Option 2: Run Node.js Script

```bash
# Make sure BigQuery credentials are configured
# Either set GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS_BASE64

# Run the script
npx tsx scripts/query-top-200-publishers.mts
```

Output will be saved to: `SEA_Top_200_Pubs.csv`

## Query Details

- **Table**: `gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`
- **Date Range**: Last 30 days from current date
- **Limit**: Top 200 publishers by revenue
- **Columns**: PIC, MID, Media, total_revenue, and product breakdown

## Product Naming

**APP Team** (with `app_` prefix):
- `app_interstitial`
- `app_appopen`
- `app_reward`

**WEB Team** (no prefix):
- `interstitial`
- `adrecover`, `adrefresh`, `pnp`
- `offerwall`, `wipead`, `overlay`
- `flexiblesticky`, `video`

**AdSense Solution**:
- `as`
