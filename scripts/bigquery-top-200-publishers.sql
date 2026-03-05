-- BigQuery Query: Top 200 Publishers by Revenue (Last 30 Days)
-- Matches CSV format: d:\Downloads\[SEA] QBR 2025Q2 - 08_Top Pubs.csv
--
-- Product Naming Conventions:
-- - APP Team: app_interstitial, app_appopen, app_reward (with app_ prefix)
-- - WEB Team: interstitial, adrecover, adrefresh, pnp, offerwall, wipead, overlay, flexiblesticky, video
-- - Video includes: video, mixed_videosticky_wipead, and any product with '%video%'
-- - AdSense: as

SELECT
  pic AS PIC,
  mid AS MID,
  medianame AS Media,
  SUM(CAST(rev AS FLOAT64)) AS total_revenue,

  -- Web Products (no prefix)
  SUM(CASE WHEN LOWER(product) = 'adrecover' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS AdRecover,
  SUM(CASE WHEN LOWER(product) = 'adrefresh' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS AdRefresh,
  SUM(CASE WHEN LOWER(product) = 'pnp' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS PnP,
  SUM(CASE WHEN LOWER(product) = 'offerwall' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS Offerwall,
  SUM(CASE WHEN LOWER(product) = 'wipead' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS WipeAd,
  SUM(CASE WHEN LOWER(product) = 'overlay' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS Overlay,
  SUM(CASE WHEN LOWER(product) = 'flexiblesticky' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS FlexibleSticky,
  SUM(CASE WHEN LOWER(product) = 'video' OR LOWER(product) LIKE '%video%' OR LOWER(product) = 'mixed_videosticky_wipead' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS Video,

  -- Interstitial: includes both web ('interstitial') and app ('app_interstitial')
  SUM(CASE WHEN LOWER(product) = 'interstitial' OR LOWER(product) = 'app_interstitial' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS Interstitial,

  -- App Products (with app_ prefix)
  SUM(CASE WHEN LOWER(product) = 'app_appopen' OR LOWER(product) = 'appopen' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS AppOpen,
  SUM(CASE WHEN LOWER(product) = 'app_reward' OR LOWER(product) = 'appreward' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS Reward,

  -- AdSense Solution
  SUM(CASE WHEN LOWER(product) = 'as' OR LOWER(product) = 'adsense_solution' OR LOWER(product) = 'adsense' THEN CAST(rev AS FLOAT64) ELSE 0 END) AS AdsenseSolution

FROM `gcpp-check.GI_publisher.agg_monthly_with_pic_table_6_month`
WHERE DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND DATE < CURRENT_DATE()
GROUP BY pic, mid, medianame
ORDER BY total_revenue DESC
LIMIT 200
