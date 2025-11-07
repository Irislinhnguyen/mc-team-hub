import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery({
  projectId: 'gcpp-check',
  keyFilename: 'service-account.json'
});

const tableName = '`gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`';

console.log('='.repeat(80));
console.log('TEAM FILTER PATTERN ANALYSIS');
console.log('='.repeat(80));

// Query 1: Analyze PIC Prefixes
console.log('\n📊 QUERY 1: PIC PREFIX ANALYSIS');
console.log('-'.repeat(80));
const query1 = `
  SELECT
    SUBSTR(pic, 1, 2) as prefix_2char,
    SUBSTR(pic, 1, 3) as prefix_3char,
    COUNT(*) as count,
    ROUND(SUM(rev), 2) as total_rev
  FROM ${tableName}
  WHERE pic IS NOT NULL
  GROUP BY prefix_2char, prefix_3char
  ORDER BY count DESC
`;
const [rows1] = await bigquery.query(query1);
console.table(rows1);

// Query 2: APP Products with PICs
console.log('\n📱 QUERY 2: APP PRODUCTS WITH THEIR PICs');
console.log('-'.repeat(80));
const query2 = `
  SELECT
    pic,
    product,
    COUNT(*) as count,
    ROUND(SUM(rev), 2) as total_rev
  FROM ${tableName}
  WHERE product LIKE 'app_%'
  GROUP BY pic, product
  ORDER BY total_rev DESC
  LIMIT 30
`;
const [rows2] = await bigquery.query(query2);
console.table(rows2);

// Query 3: WEB_GV Pattern Verification
console.log('\n🇻🇳 QUERY 3: WEB_GV (VN) PATTERN VERIFICATION');
console.log('-'.repeat(80));
const query3 = `
  SELECT
    pic,
    COUNT(DISTINCT product) as product_count,
    ROUND(SUM(rev), 2) as total_rev,
    ARRAY_TO_STRING(ARRAY_AGG(DISTINCT product LIMIT 5), ', ') as sample_products
  FROM ${tableName}
  WHERE pic LIKE 'VN_%' OR pic LIKE 'vn_%'
  GROUP BY pic
  ORDER BY total_rev DESC
  LIMIT 20
`;
const [rows3] = await bigquery.query(query3);
console.table(rows3);

// Query 4: Test Current Logic
console.log('\n🔍 QUERY 4: CURRENT FILTER LOGIC TEST');
console.log('-'.repeat(80));

// Test WEB_GV
const query4a = `
  SELECT 'Current WEB_GV' as test, COUNT(*) as count, ROUND(SUM(rev), 2) as total_rev
  FROM ${tableName}
  WHERE (pic LIKE 'VN_%' OR pic LIKE 'vn_%')
`;
const [rows4a] = await bigquery.query(query4a);
console.table(rows4a);

// Test APP
const query4b = `
  SELECT 'Current APP' as test, COUNT(*) as count, ROUND(SUM(rev), 2) as total_rev
  FROM ${tableName}
  WHERE product LIKE 'app_%'
`;
const [rows4b] = await bigquery.query(query4b);
console.table(rows4b);

// Test WEB_GTI
const query4c = `
  SELECT 'Current WEB_GTI' as test, COUNT(*) as count, ROUND(SUM(rev), 2) as total_rev
  FROM ${tableName}
  WHERE (pic LIKE 'ID_%' OR pic LIKE 'id_%')
`;
const [rows4c] = await bigquery.query(query4c);
console.table(rows4c);

// Query 5: Overlap Detection
console.log('\n🔄 QUERY 5: PIC vs PRODUCT OVERLAP ANALYSIS');
console.log('-'.repeat(80));
const query5 = `
  SELECT
    CASE
      WHEN pic LIKE 'ID_%' OR pic LIKE 'id_%' THEN 'WEB_GTI'
      WHEN pic LIKE 'VN_%' OR pic LIKE 'vn_%' THEN 'WEB_GV'
      ELSE 'OTHER'
    END as pic_team,
    CASE
      WHEN product LIKE 'app_%' THEN 'APP'
      ELSE 'WEB'
    END as product_type,
    COUNT(*) as count,
    ROUND(SUM(rev), 2) as total_rev
  FROM ${tableName}
  WHERE pic IS NOT NULL
  GROUP BY pic_team, product_type
  ORDER BY total_rev DESC
`;
const [rows5] = await bigquery.query(query5);
console.table(rows5);

// Query 6: Sample Data for WEB_GV + APP Overlap
console.log('\n📋 QUERY 6: SAMPLE DATA - WEB_GV PICs WITH APP PRODUCTS');
console.log('-'.repeat(80));
const query6 = `
  SELECT pic, product, ROUND(rev, 2) as rev, ROUND(profit, 2) as profit
  FROM ${tableName}
  WHERE (pic LIKE 'VN_%' OR pic LIKE 'vn_%')
    AND product LIKE 'app_%'
  ORDER BY rev DESC
  LIMIT 10
`;
const [rows6] = await bigquery.query(query6);
console.table(rows6);

// Query 7: Sample Data for WEB_GTI + APP Overlap
console.log('\n📋 QUERY 7: SAMPLE DATA - WEB_GTI PICs WITH APP PRODUCTS');
console.log('-'.repeat(80));
const query7 = `
  SELECT pic, product, ROUND(rev, 2) as rev, ROUND(profit, 2) as profit
  FROM ${tableName}
  WHERE (pic LIKE 'ID_%' OR pic LIKE 'id_%')
    AND product LIKE 'app_%'
  ORDER BY rev DESC
  LIMIT 10
`;
const [rows7] = await bigquery.query(query7);
console.table(rows7);

// Summary and Recommendations
console.log('\n' + '='.repeat(80));
console.log('📝 ANALYSIS SUMMARY & RECOMMENDATIONS');
console.log('='.repeat(80));

console.log('\n🎯 KEY FINDINGS:');
console.log('1. PIC patterns show clear team separation (ID_ vs VN_)');
console.log('2. APP products (app_*) can appear with BOTH VN_ and ID_ PICs');
console.log('3. This means APP is a PRODUCT TYPE, not a TEAM!');
console.log('\n💡 CURRENT PROBLEM:');
console.log('   - When user selects "APP" team, it filters ALL app products');
console.log('   - But APP products belong to BOTH WEB_GV and WEB_GTI teams');
console.log('   - So APP filter shows data from multiple teams mixed together');
console.log('\n✅ RECOMMENDATION:');
console.log('   Option 1: Remove APP as a team filter (it\'s a product type)');
console.log('   Option 2: Keep APP but clarify it shows "All App Products (cross-team)"');
console.log('   Option 3: Split into APP_GV (VN_ + app_) and APP_GTI (ID_ + app_)');
console.log('\n' + '='.repeat(80));
