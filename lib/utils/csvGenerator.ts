/**
 * CSV Generator for Tag Creation Tool
 * Generates CSV with ALL 35 columns matching template_zone_template exactly
 * Only fills columns that have data, leaves others empty
 */

import type { GeneratedZone } from '@/lib/types/tools'

// CSV Headers - MUST match template_zone_template exactly (35 columns)
const CSV_HEADERS = [
  'Media Id',
  'Name of zone',
  'Zone URL',
  'Allowed domain list',
  'Inventory Type',
  'Type of zone',
  'width',
  'height',
  'Use multiple sizes',
  'Multi sizes',
  'Enable Bidder Delivery',
  'Create Reports from Bid Price',
  'Method of Bidprice',
  'CPM(iOS)(JPY)',
  'CPM(Android)(JPY)',
  'CPM(Other)(JPY)',
  'Floor Price(JPY)',
  'Deduct margin from RTB value at bidder delivery',
  'Zone position',
  'Allow Semi Adult Contents',
  'Allow semi-adult categories',
  'Use RTB',
  'Allow External Delivery',
  'App ID',
  'Allow VtoV',
  'Category',
  'Category Detail',
  'Default Payout rate for zone',
  'Adjust Iframe size',
  'Selector of Iframe Adjuster',
  'RTB optimisation type',
  'Vendor comment',
  'Format',
  'Device',
  'Delivery Method',
] as const

/**
 * Zone data for CSV output (35 columns matching template)
 */
export interface ZoneCsvRow {
  mediaId: string // Media Id (= MID from Step 0)
  nameOfZone: string // Name of zone (AI generated)
  zoneUrl: string // Zone URL
  allowedDomainList: string // Allowed domain list (empty by default)
  inventoryType: string // Inventory Type
  typeOfZone: string // Type of zone
  width: string // width (default: '300' or from AI)
  height: string // height (default: '250' or from AI)
  useMultipleSizes: string // Use multiple sizes (empty by default)
  multiSizes: string // Multi sizes (empty by default)
  enableBidderDelivery: string // Enable Bidder Delivery (empty by default)
  createReportsFromBidPrice: string // Create Reports from Bid Price (empty by default)
  methodOfBidprice: string // Method of Bidprice (empty by default)
  cpmIosJpy: string // CPM(iOS)(JPY) (empty by default)
  cpmAndroidJpy: string // CPM(Android)(JPY) (empty by default)
  cpmOtherJpy: string // CPM(Other)(JPY) (empty by default)
  floorPriceJpy: string // Floor Price(JPY) (empty by default)
  deductMarginFromRtb: string // Deduct margin from RTB value (empty by default)
  zonePosition: string // Zone position
  allowSemiAdultContents: string // Allow Semi Adult Contents (empty by default)
  allowSemiAdultCategories: string // Allow semi-adult categories (empty)
  useRtb: string // Use RTB
  allowExternalDelivery: string // Allow External Delivery
  appId: string // App ID (extracted from URL)
  allowVtoV: string // Allow VtoV (empty by default)
  category: string // Category
  categoryDetail: string // Category Detail
  defaultPayoutRate: string // Default Payout rate for zone
  adjustIframeSize: string // Adjust Iframe size (empty by default)
  selectorOfIframeAdjuster: string // Selector of Iframe Adjuster (empty)
  rtbOptimisationType: string // RTB optimisation type
  vendorComment: string // Vendor comment (empty by default)
  format: string // Format (empty by default)
  device: string // Device (empty by default)
  deliveryMethod: string // Delivery Method (empty by default)
}

/**
 * Default values for zone template (same as current system)
 */
export const DEFAULT_ZONE_VALUES: Partial<ZoneCsvRow> = {
  allowedDomainList: '',
  inventoryType: 'Mobile Optimized Web',
  typeOfZone: 'スタンダードバナー',
  width: '300',
  height: '250',
  useMultipleSizes: '',
  multiSizes: '',
  enableBidderDelivery: '',
  createReportsFromBidPrice: '',
  methodOfBidprice: '',
  cpmIosJpy: '',
  cpmAndroidJpy: '',
  cpmOtherJpy: '',
  floorPriceJpy: '',
  deductMarginFromRtb: '',
  zonePosition: 'Under the article/column',
  allowSemiAdultContents: '',
  allowSemiAdultCategories: '',
  useRtb: 'YES',
  allowExternalDelivery: 'YES',
  allowVtoV: '',
  category: 'アート＆エンターテイメント',
  categoryDetail: 'ユーモア',
  adjustIframeSize: '',
  selectorOfIframeAdjuster: '',
  rtbOptimisationType: 'Prioritise revenue',
  vendorComment: '',
  format: '',
  device: '',
  deliveryMethod: '',
}

/**
 * Convert ZoneCsvRow to CSV row string
 * Handles escaping of commas, quotes, and newlines
 */
function rowToCsv(row: ZoneCsvRow): string {
  const values: string[] = [
    row.mediaId,
    row.nameOfZone,
    row.zoneUrl,
    row.allowedDomainList,
    row.inventoryType,
    row.typeOfZone,
    row.width,
    row.height,
    row.useMultipleSizes,
    row.multiSizes,
    row.enableBidderDelivery,
    row.createReportsFromBidPrice,
    row.methodOfBidprice,
    row.cpmIosJpy,
    row.cpmAndroidJpy,
    row.cpmOtherJpy,
    row.floorPriceJpy,
    row.deductMarginFromRtb,
    row.zonePosition,
    row.allowSemiAdultContents,
    row.allowSemiAdultCategories,
    row.useRtb,
    row.allowExternalDelivery,
    row.appId,
    row.allowVtoV,
    row.category,
    row.categoryDetail,
    row.defaultPayoutRate,
    row.adjustIframeSize,
    row.selectorOfIframeAdjuster,
    row.rtbOptimisationType,
    row.vendorComment,
    row.format,
    row.device,
    row.deliveryMethod,
  ]

  // Escape values that contain commas, quotes, or newlines
  return values
    .map((value) => {
      if (value === null || value === undefined) {
        return ''
      }
      const stringValue = String(value)
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    .join(',')
}

/**
 * Generate CSV content from ZoneCsvRow array
 * @param zones - Array of zone data rows
 * @returns CSV string with header row
 */
export function generateZoneCsv(zones: ZoneCsvRow[]): string {
  const bom = '\uFEFF' // UTF-8 BOM for Excel compatibility

  if (zones.length === 0) {
    return bom + CSV_HEADERS.join(',')
  }

  const header = CSV_HEADERS.join(',')
  const rows = zones.map(rowToCsv).join('\n')

  // Add UTF-8 BOM at the beginning for Excel compatibility
  return bom + `${header}\n${rows}`
}

/**
 * Download CSV file
 * @param zones - Array of zone data rows
 * @param filename - Download filename (default: zones_TIMESTAMP.csv)
 */
export function downloadZoneCsv(zones: ZoneCsvRow[], filename?: string): void {
  const csvContent = generateZoneCsv(zones)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute(
    'download',
    filename || `zones_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.csv`
  )
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Convert GeneratedZone to ZoneCsvRow
 * Adds MID and applies default values
 */
export function generatedZoneToCsvRow(
  zone: GeneratedZone,
  mid: string,
  zoneUrl: string,
  appId: string,
  payoutRate: string
): ZoneCsvRow {
  return {
    mediaId: mid,
    nameOfZone: zone['Name of zone'] || '',
    zoneUrl: zoneUrl,
    allowedDomainList: zone['Allowed domain list'] || '',
    inventoryType: zone['Inventory Type'] || DEFAULT_ZONE_VALUES.inventoryType!,
    typeOfZone: zone['Type of zone'] || DEFAULT_ZONE_VALUES.typeOfZone!,
    width: String(zone.width || DEFAULT_ZONE_VALUES.width),
    height: String(zone.height || DEFAULT_ZONE_VALUES.height),
    useMultipleSizes: zone['Use multiple sizes'] || '',
    multiSizes: zone['Multi sizes'] || '',
    enableBidderDelivery: zone['Enable Bidder Delivery'] || '',
    createReportsFromBidPrice: zone['Create Reports from Bid Price'] || '',
    methodOfBidprice: zone['Method of Bidprice'] || '',
    cpmIosJpy: '',
    cpmAndroidJpy: '',
    cpmOtherJpy: '',
    floorPriceJpy: '',
    deductMarginFromRtb: zone['Deduct margin from RTB value at bidder delivery'] || '',
    zonePosition: zone['Zone position'] || DEFAULT_ZONE_VALUES.zonePosition!,
    allowSemiAdultContents: zone['Allow Semi Adult Contents'] || '',
    allowSemiAdultCategories: zone['Allow semi-adult categories'] || '',
    useRtb: zone['Use RTB'] || DEFAULT_ZONE_VALUES.useRtb!,
    allowExternalDelivery: zone['Allow External Delivery'] || DEFAULT_ZONE_VALUES.allowExternalDelivery!,
    appId: appId || zone['App ID'] || '',
    allowVtoV: zone['Allow VtoV'] || '',
    category: zone.Category || DEFAULT_ZONE_VALUES.category!,
    categoryDetail: zone['Category Detail'] || DEFAULT_ZONE_VALUES.categoryDetail!,
    defaultPayoutRate: zone['Default Payout rate for zone'] ? String(zone['Default Payout rate for zone']) : payoutRate,
    adjustIframeSize: zone['Adjust Iframe size'] || '',
    selectorOfIframeAdjuster: zone['Selector of Iframe Adjuster'] || '',
    rtbOptimisationType: zone['RTB optimisation type'] || DEFAULT_ZONE_VALUES.rtbOptimisationType!,
    vendorComment: zone['Vendor comment'] || '',
    format: zone.Format || '',
    device: zone.Device || '',
    deliveryMethod: zone['Delivery Method'] || '',
  }
}

/**
 * Create a default ZoneCsvRow with common values
 */
export function createDefaultZoneRow(overrides: Partial<ZoneCsvRow> = {}): ZoneCsvRow {
  return {
    mediaId: '',
    nameOfZone: '',
    zoneUrl: '',
    allowedDomainList: '',
    inventoryType: DEFAULT_ZONE_VALUES.inventoryType!,
    typeOfZone: DEFAULT_ZONE_VALUES.typeOfZone!,
    width: DEFAULT_ZONE_VALUES.width!,
    height: DEFAULT_ZONE_VALUES.height!,
    useMultipleSizes: '',
    multiSizes: '',
    enableBidderDelivery: '',
    createReportsFromBidPrice: '',
    methodOfBidprice: '',
    cpmIosJpy: '',
    cpmAndroidJpy: '',
    cpmOtherJpy: '',
    floorPriceJpy: '',
    deductMarginFromRtb: '',
    zonePosition: DEFAULT_ZONE_VALUES.zonePosition!,
    allowSemiAdultContents: '',
    allowSemiAdultCategories: '',
    useRtb: DEFAULT_ZONE_VALUES.useRtb!,
    allowExternalDelivery: DEFAULT_ZONE_VALUES.allowExternalDelivery!,
    appId: '',
    allowVtoV: '',
    category: DEFAULT_ZONE_VALUES.category!,
    categoryDetail: DEFAULT_ZONE_VALUES.categoryDetail!,
    defaultPayoutRate: '',
    adjustIframeSize: '',
    selectorOfIframeAdjuster: '',
    rtbOptimisationType: DEFAULT_ZONE_VALUES.rtbOptimisationType!,
    vendorComment: '',
    format: '',
    device: '',
    deliveryMethod: '',
    ...overrides,
  }
}
