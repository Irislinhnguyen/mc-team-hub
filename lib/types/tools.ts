/**
 * Type definitions for AI Tools section
 */

// Tool Registry Types
export interface Tool {
  id: string
  name: string
  description: string
  category: 'automation' | 'analysis' | 'reporting'
  icon: string
  route: string
  isActive: boolean
  requiredRole?: 'admin' | 'manager' | 'user'
}

// Tag Creation Tool Types

// Generated Zone (from AI CSV generation)
export interface GeneratedZone {
  'Name of zone': string
  'Zone URL': string
  'Allowed domain list'?: string | null
  'Inventory Type': string
  'Type of zone': string
  width: number
  height: number
  'Use multiple sizes'?: string | null
  'Multi sizes'?: string | null
  'Enable Bidder Delivery'?: string | null
  'Create Reports from Bid Price'?: string | null
  'Method of Bidprice'?: string | null
  'CPM(iOS)(USD)'?: number | null
  'CPM(Android)(USD)'?: number | null
  'CPM(Other)(USD)'?: number | null
  'Floor Price(USD)'?: number | null
  'Deduct margin from RTB value at bidder delivery'?: string | null
  'Zone position'?: string | null
  'Allow Semi Adult Contents'?: string | null
  'Allow semi-adult categories'?: string | null
  'Use RTB': string
  'Allow External Delivery': string
  'App ID'?: string | null
  'Allow VtoV'?: string | null
  Category: string
  'Category Detail'?: string | null
  'Default Payout rate for zone'?: number | null
  'Adjust Iframe size'?: string | null
  'Selector of Iframe Adjuster'?: string | null
  'RTB optimisation type'?: string | null
  'Vendor comment'?: string | null
  Format?: string | null
  Device?: string | null
  'Delivery Method'?: string | null
}

// Extracted Zone (from screenshot AI Vision)
export interface ExtractedZone {
  zone_id: string
  zone_name: string
  size: string
  inventory_type?: string | null
  type?: string | null
  category?: string | null
  approval_status?: string | null
  impressions?: number | null
  ctr?: number | null
  revenue?: number | null
  ecpm?: number | null
  ad_source?: string | null

  // Team APP new fields (for Google Sheets sync)
  payout_rate?: string // Column M - auto-filled from Step 1
  floor_price?: string // Column N - auto-filled from zone name
  account?: string // Column O - GI/GJ dropdown (default: GI)
}

// API Response Types
export interface GenerateCsvResponse {
  status: 'success' | 'error'
  zones?: GeneratedZone[]
  downloadUrl?: string
  error?: string
}

export interface ExtractResponse {
  status: 'success' | 'error'
  zones: ExtractedZone[]
  confidence?: number
  error?: string
}

export interface SyncResponse {
  status: 'success' | 'error'
  rowsWritten: number
  sheetUrl: string
  error?: string
}

// Team Type (App vs Web workflows)
export type TeamType = 'app' | 'web'

// Product Selection for Web Team
export interface ProductSelection {
  product: string
  quantity: number // For non-Banner products
  sizes?: { size: string; quantity: number }[] // For Banner products - each size has its own quantity
  notes?: string // Optional notes (e.g., "GAMtag", "Header", etc.)
}

// Banner Size Configuration
export interface BannerSizeConfig {
  preset?: '300x250' | '728x90' | '320x50' | '468x60' | '970x250'
  custom?: {
    width: number
    height: number
  }
}

// Web Team Zone Form Data
export interface WebZoneFormData {
  mediaName: string
  products: ProductSelection[]
  bannerSize?: BannerSizeConfig
  payoutRate: string
  aiPrompt?: string
}

// Generated Web Zone (extends ExtractedZone)
export interface GeneratedWebZone extends ExtractedZone {
  product: string
  sequenceNumber: number
}

// ============================================================
// NEW: Multi-MID Workflow Types (Step 0, 1, 3)
// ============================================================

// Media Template Row (from CSV upload in Step 0)
export interface MediaTemplateRow {
  pid: string // Publisher ID (from CSV)
  siteAppName: string // Site/App Name (from CSV)
  siteUrl: string // Site URL (from CSV)
  publisherComment?: string
  vendorComment?: string
  pubname?: string // Publisher Name (user enters per row)
  mid?: string // Media ID (user enters per row)
  // Common fields (CHUNG CHO TẤT CẢ - entered once for all rows)
  childNetworkCode?: string // Child Network Code (from Step 0, common for all)
  pic?: string // PIC (from Step 0, common for all)
}

// MID with zones (for Step 1 multi-MID support)
export interface MidWithZones {
  mid: string
  siteAppName: string
  zones: GeneratedZone[] | ExtractedZone[]
}

// Step 0 State
export interface Step0Data {
  medias: MediaTemplateRow[]
  // Indexed by MID for quick lookup
  byMid: Record<string, MediaTemplateRow>
  // Common fields (CHUNG CHO TẤT CẢ - entered once for all rows)
  childNetworkCode?: string // Child Network Code (common for all MIDs)
  pic?: string // PIC (common for all MIDs)
}

// Sync status per MID (for Step 3)
export interface MidSyncStatus {
  mid: string
  status: 'pending' | 'syncing' | 'synced' | 'error'
  syncedAt?: Date
  error?: string
}

// Zone Row for CSV output (35 columns matching template_zone_template)
export interface ZoneCsvRow {
  mediaId: string // Media Id (= MID)
  nameOfZone: string // Name of zone
  zoneUrl: string // Zone URL
  allowedDomainList: string // Allowed domain list
  inventoryType: string // Inventory Type
  typeOfZone: string // Type of zone
  width: string // width
  height: string // height
  useMultipleSizes: string // Use multiple sizes
  multiSizes: string // Multi sizes
  enableBidderDelivery: string // Enable Bidder Delivery
  createReportsFromBidPrice: string // Create Reports from Bid Price
  methodOfBidprice: string // Method of Bidprice
  cpmIosJpy: string // CPM(iOS)(JPY)
  cpmAndroidJpy: string // CPM(Android)(JPY)
  cpmOtherJpy: string // CPM(Other)(JPY)
  floorPriceJpy: string // Floor Price(JPY)
  deductMarginFromRtb: string // Deduct margin from RTB value at bidder delivery
  zonePosition: string // Zone position
  allowSemiAdultContents: string // Allow Semi Adult Contents
  allowSemiAdultCategories: string // Allow semi-adult categories
  useRtb: string // Use RTB
  allowExternalDelivery: string // Allow External Delivery
  appId: string // App ID
  allowVtoV: string // Allow VtoV
  category: string // Category
  categoryDetail: string // Category Detail
  defaultPayoutRate: string // Default Payout rate for zone
  adjustIframeSize: string // Adjust Iframe size
  selectorOfIframeAdjuster: string // Selector of Iframe Adjuster
  rtbOptimisationType: string // RTB optimisation type
  vendorComment: string // Vendor comment
  format: string // Format
  device: string // Device
  deliveryMethod: string // Delivery Method
}

// Pending zones for Step 1 (before CSV generation)
export interface PendingZonesByMid {
  mid: string
  siteAppName: string
  zones: ZoneCsvRow[]
}
