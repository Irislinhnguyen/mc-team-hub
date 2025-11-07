import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: 'gcpp-check',
  keyFilename: 'service-account.json'
});

const tableName = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`';

console.log('='.repeat(80));
console.log('DEEP ANALYSIS: WEB_GV APP PRODUCTS - Where do they come from?');
console.log('='.repeat(80));

// Query 1: Top zones with WEB_GV + APP products
console.log('\n🔍 QUERY 1: TOP ZONES - WEB_GV PICs + APP Products');
console.log('-'.repeat(80));
const query1 = `
  SELECT
    pic,
    zonename,
    product,
    COUNT(*) as count,
    ROUND(SUM(rev), 2) as total_rev,
    ROUND(SUM(profit), 2) as total_profit
  FROM ${tableName}
  WHERE (pic LIKE 'VN_%' OR pic LIKE 'vn_%')
    AND product LIKE 'app_%'
  GROUP BY pic, zonename, product
  ORDER BY total_rev DESC
  LIMIT 30
`;
const [rows1] = await bigquery.query(query1);
console.table(rows1);

// Query 2: Count by PIC
console.log('\n📊 QUERY 2: WEB_GV PICs with APP products - Summary');
console.log('-'.repeat(80));
const query2 = `
  SELECT
    pic,
    COUNT(DISTINCT zonename) as unique_zones,
    COUNT(DISTINCT product) as unique_products,
    COUNT(*) as total_records,
    ROUND(SUM(rev), 2) as total_rev
  FROM ${tableName}
  WHERE (pic LIKE 'VN_%' OR pic LIKE 'vn_%')
    AND product LIKE 'app_%'
  GROUP BY pic
  ORDER BY total_rev DESC
`;
const [rows2] = await bigquery.query(query2);
console.table(rows2);

// Query 3: Sample zonenames - check if they look like app zones
console.log('\n🏷️  QUERY 3: SAMPLE ZONE NAMES (First 30)');
console.log('-'.repeat(80));
const query3 = `
  SELECT
    zonename,
    COUNT(*) as usage_count,
    ROUND(SUM(rev), 2) as total_rev
  FROM ${tableName}
  WHERE (pic LIKE 'VN_%' OR pic LIKE 'vn_%')
    AND product LIKE 'app_%'
  GROUP BY zonename
  ORDER BY total_rev DESC
  LIMIT 30
`;
const [rows3] = await bigquery.query(query3);
console.table(rows3);

// Query 4: Compare same PIC - WEB vs APP products
console.log('\n⚖️  QUERY 4: COMPARISON - Same PICs, WEB vs APP Products');
console.log('-'.repeat(80));
const query4 = `
  SELECT
    pic,
    CASE WHEN product LIKE 'app_%' THEN 'APP' ELSE 'WEB' END as type,
    COUNT(*) as count,
    ROUND(SUM(rev), 2) as total_rev
  FROM ${tableName}
  WHERE pic IN ('VN_anhtn', 'VN_minhlh', 'VN_ngocth', 'VN_ngantt', 'VN_hang')
  GROUP BY pic, type
  ORDER BY pic, type
`;
const [rows4] = await bigquery.query(query4);
console.table(rows4);

// Query 5: Check if zone names indicate app zones
console.log('\n🎯 QUERY 5: ZONE NAME PATTERNS - Looking for app indicators');
console.log('-'.repeat(80));
const query5 = `
  SELECT
    CASE
      WHEN LOWER(zonename) LIKE '%app%' THEN 'Contains "app"'
      WHEN LOWER(zonename) LIKE '%mobile%' THEN 'Contains "mobile"'
      WHEN LOWER(zonename) LIKE '%android%' THEN 'Contains "android"'
      WHEN LOWER(zonename) LIKE '%ios%' THEN 'Contains "ios"'
      ELSE 'No app indicator'
    END as zone_category,
    COUNT(*) as count,
    ROUND(SUM(rev), 2) as total_rev
  FROM ${tableName}
  WHERE (pic LIKE 'VN_%' OR pic LIKE 'vn_%')
    AND product LIKE 'app_%'
  GROUP BY zone_category
  ORDER BY total_rev DESC
`;
const [rows5] = await bigquery.query(query5);
console.table(rows5);

console.log('\n' + '='.repeat(80));
console.log('🎯 CONCLUSIONS:');
console.log('='.repeat(80));
console.log('Check the zone names above to understand:');
console.log('1. Are these legitimate app zones managed by VN team?');
console.log('2. Or is there data quality issue?');
console.log('3. Should APP products with VN_ pic be considered WEB_GV or separate?');
console.log('='.repeat(80));
