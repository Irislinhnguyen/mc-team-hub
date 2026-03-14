/**
 * CSV/Excel Generator for Tag Creation Tool
 * Generates XLSX files with ALL 36 columns matching the internal ad system template
 * Only fills columns that have data, leaves others empty
 */

import type { GeneratedZone } from '@query-stream-ai/types/tools'
import * as XLSX from 'xlsx'

// CSV Headers - MUST match template_zone_template exactly (36 columns)
const CSV_HEADERS = [
  'Media Id',
  'Name of zone',
  'Zone URL',
  'Allowed domain list',
  'Point site domain list',
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
 * Zone data for CSV output (36 columns matching template)
 */
export interface ZoneCsvRow {
  mediaId: string // Media Id (= MID from Step 0)
  nameOfZone: string // Name of zone (AI generated)
  zoneUrl: string // Zone URL
  allowedDomainList: string // Allowed domain list (empty by default)
  pointSiteDomainList: string // Point site domain list (empty by default)
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
  pointSiteDomainList: '',
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
 * Convert ZoneCsvRow to object for XLSX generation
 * @param row - Zone CSV row data
 * @returns Object with proper column names matching the 36-column template
 */
function zoneCsvRowToObject(row: ZoneCsvRow): Record<string, any> {
  return {
    'Media Id': row.mediaId,
    'Name of zone': row.nameOfZone,
    'Zone URL': row.zoneUrl,
    'Allowed domain list': row.allowedDomainList,
    'Point site domain list': row.pointSiteDomainList,
    'Inventory Type': row.inventoryType,
    'Type of zone': row.typeOfZone,
    width: row.width,
    height: row.height,
    'Use multiple sizes': row.useMultipleSizes,
    'Multi sizes': row.multiSizes,
    'Enable Bidder Delivery': row.enableBidderDelivery,
    'Create Reports from Bid Price': row.createReportsFromBidPrice,
    'Method of Bidprice': row.methodOfBidprice,
    'CPM(iOS)(JPY)': row.cpmIosJpy,
    'CPM(Android)(JPY)': row.cpmAndroidJpy,
    'CPM(Other)(JPY)': row.cpmOtherJpy,
    'Floor Price(JPY)': row.floorPriceJpy,
    'Deduct margin from RTB value at bidder delivery': row.deductMarginFromRtb,
    'Zone position': row.zonePosition,
    'Allow Semi Adult Contents': row.allowSemiAdultContents,
    'Allow semi-adult categories': row.allowSemiAdultCategories,
    'Use RTB': row.useRtb,
    'Allow External Delivery': row.allowExternalDelivery,
    'App ID': row.appId,
    'Allow VtoV': row.allowVtoV,
    Category: row.category,
    'Category Detail': row.categoryDetail,
    'Default Payout rate for zone': row.defaultPayoutRate,
    'Adjust Iframe size': row.adjustIframeSize,
    'Selector of Iframe Adjuster': row.selectorOfIframeAdjuster,
    'RTB optimisation type': row.rtbOptimisationType,
    'Vendor comment': row.vendorComment,
    Format: row.format,
    Device: row.device,
    'Delivery Method': row.deliveryMethod,
  }
}

/**
 * Generate XLSX buffer from ZoneCsvRow array
 * @param zones - Array of zone data rows
 * @returns Buffer containing XLSX file data
 */
export function generateZoneCsv(zones: ZoneCsvRow[]): Buffer {
  // Convert ZoneCsvRow[] to objects for XLSX
  const zoneObjects = zones.map(zoneCsvRowToObject)

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(zoneObjects, { header: CSV_HEADERS })

  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Zones')

  // Set column widths for better readability (36 columns total)
  const columnWidths = [
    { wch: 15 }, // Media Id
    { wch: 35 }, // Name of zone
    { wch: 50 }, // Zone URL
    { wch: 20 }, // Allowed domain list
    { wch: 25 }, // Point site domain list
    { wch: 25 }, // Inventory Type
    { wch: 20 }, // Type of zone
    { wch: 10 }, // width
    { wch: 10 }, // height
    { wch: 20 }, // Use multiple sizes
    { wch: 20 }, // Multi sizes
    { wch: 20 }, // Enable Bidder Delivery
    { wch: 25 }, // Create Reports from Bid Price
    { wch: 20 }, // Method of Bidprice
    { wch: 15 }, // CPM(iOS)(JPY)
    { wch: 15 }, // CPM(Android)(JPY)
    { wch: 15 }, // CPM(Other)(JPY)
    { wch: 15 }, // Floor Price(JPY)
    { wch: 30 }, // Deduct margin from RTB value at bidder delivery
    { wch: 25 }, // Zone position
    { wch: 25 }, // Allow Semi Adult Contents
    { wch: 25 }, // Allow semi-adult categories
    { wch: 15 }, // Use RTB
    { wch: 20 }, // Allow External Delivery
    { wch: 30 }, // App ID
    { wch: 15 }, // Allow VtoV
    { wch: 30 }, // Category
    { wch: 20 }, // Category Detail
    { wch: 25 }, // Default Payout rate for zone
    { wch: 20 }, // Adjust Iframe size
    { wch: 25 }, // Selector of Iframe Adjuster
    { wch: 25 }, // RTB optimisation type
    { wch: 20 }, // Vendor comment
    { wch: 15 }, // Format
    { wch: 15 }, // Device
    { wch: 20 }, // Delivery Method
  ]
  worksheet['!cols'] = columnWidths

  // Generate buffer
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

/**
 * Download XLSX file
 * @param zones - Array of zone data rows
 * @param filename - Download filename (default: zones_TIMESTAMP.xlsx)
 */
export function downloadZoneCsv(zones: ZoneCsvRow[], filename?: string): void {
  const buffer = generateZoneCsv(zones)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute(
    'download',
    filename || `zones_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.xlsx`
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
    pointSiteDomainList: zone['Point site domain list'] || '',
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
    pointSiteDomainList: '',
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
