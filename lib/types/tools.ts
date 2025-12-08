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
