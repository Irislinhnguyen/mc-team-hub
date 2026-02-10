'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Plus, X, CheckCircle2, Check, ChevronsUpDown, FileDown } from 'lucide-react'
import type { ExtractedZone, ProductSelection, MidWithZones, MediaTemplateRow, Step0Data } from '@/lib/types/tools'
import type { ZoneCsvRow } from '@/lib/utils/csvGenerator'
import { downloadZoneCsv } from '@/lib/utils/csvGenerator'
import { HelpIcon } from './HelpIcon'

/**
 * Convert ExtractedZone to ZoneCsvRow (for Web team)
 * Uses same 35-column format as App team
 */
function extractedZoneToCsvRow(
  zone: ExtractedZone,
  mid: string,
  mediaName: string,
  payoutRate: string
): ZoneCsvRow {
  return {
    mediaId: mid,
    nameOfZone: zone.zone_name,
    zoneUrl: `https://${mediaName}`,
    allowedDomainList: mediaName,
    inventoryType: 'Web',
    typeOfZone: zone.type || 'Banner',
    width: zone.size?.split('x')[0] || '300',
    height: zone.size?.split('x')[1] || '250',
    useMultipleSizes: '',
    multiSizes: '',
    enableBidderDelivery: '',
    createReportsFromBidPrice: '',
    methodOfBidprice: '',
    cpmIosJpy: '',
    cpmAndroidJpy: '',
    cpmOtherJpy: '',
    floorPriceJpy: zone.floor_price || '',
    deductMarginFromRtb: '',
    zonePosition: '',
    allowSemiAdultContents: '',
    allowSemiAdultCategories: '',
    useRtb: 'YES',
    allowExternalDelivery: 'YES',
    appId: '',
    allowVtoV: '',
    category: zone.category || '',
    categoryDetail: '',
    defaultPayoutRate: payoutRate,
    adjustIframeSize: '',
    selectorOfIframeAdjuster: '',
    rtbOptimisationType: 'Prioritise revenue',
    vendorComment: '',
    format: '',
    device: '',
    deliveryMethod: '',
  }
}

interface WebPromptInputStepProps {
  onComplete: (zones: ExtractedZone[], appId?: string, appstoreUrl?: string, payoutRate?: string) => void
  onValuesChange?: (domain: string, payoutRate: string) => void
  step0Data?: Step0Data | null // Data from Step 0
  midWithZones?: MidWithZones[] // Already added zones
  onAddMidZones?: (mid: string, siteAppName: string, zones: ExtractedZone[], zoneUrl: string, payoutRate: string) => void // Callback with full data
  onRemoveMid?: (mid: string) => void // Callback when removing a MID
}

// Banner size presets
const BANNER_SIZE_PRESETS = [
  '300x250',
  '728x90',
  '320x50',
  '468x60',
  '970x250',
]

export function WebPromptInputStep({
  onComplete,
  onValuesChange,
  step0Data,
  midWithZones = [],
  onAddMidZones,
  onRemoveMid,
}: WebPromptInputStepProps) {
  const [selectedMid, setSelectedMid] = useState('')
  const [manualMid, setManualMid] = useState('')
  const [mediaName, setMediaName] = useState('')
  const [products, setProducts] = useState<{label: string, value: string}[]>([])
  const [selectedProducts, setSelectedProducts] = useState<ProductSelection[]>([])
  const [payoutRate, setPayoutRate] = useState('0.85')
  const [aiPrompt, setAiPrompt] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productSelectorOpen, setProductSelectorOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [cacheAge, setCacheAge] = useState<number | null>(null)
  const [sizeSelectorOpen, setSizeSelectorOpen] = useState<Record<string, boolean>>({})
  const [customSizeInput, setCustomSizeInput] = useState<Record<string, string>>({})

  // Get available MIDs from Step 0 (only those with MID filled)
  const availableMids: MediaTemplateRow[] = step0Data?.medias.filter(m => m.mid?.trim()) || []

  // Auto-fill data when MID is selected
  useEffect(() => {
    if (selectedMid && step0Data?.byMid[selectedMid]) {
      const mediaData = step0Data.byMid[selectedMid]
      setMediaName(mediaData.siteAppName || '')
      setManualMid(selectedMid) // Auto-fill MID input
    } else if (!selectedMid) {
      setMediaName('')
      // Don't clear manualMid - let user keep typing
    }
  }, [selectedMid, step0Data])

  // Sync domain (mediaName) and payoutRate to parent in real-time
  useEffect(() => {
    if (onValuesChange) {
      onValuesChange(mediaName, payoutRate)
    }
  }, [mediaName, payoutRate, onValuesChange])

  useEffect(() => {
    const CACHE_KEY = 'tag-creation-products-cache'
    const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

    const fetchProducts = async () => {
      console.log('[WebPromptInputStep] Starting to fetch products...')
      setIsLoadingProducts(true)
      try {
        const cachedData = localStorage.getItem(CACHE_KEY)
        if (cachedData) {
          const { products: cachedProducts, timestamp } = JSON.parse(cachedData)
          const age = Date.now() - timestamp

          // Use cache if less than 24 hours old
          if (age < CACHE_DURATION) {
            console.log(`[WebPromptInputStep] Using cached products (${Math.round(age / 1000 / 60)} minutes old)`)
            setProducts(cachedProducts)
            setCacheAge(age)
            setIsLoadingProducts(false)
            return
          } else {
            console.log('[WebPromptInputStep] Cache expired, fetching fresh data')
          }
        }

        // Fetch from API
        const response = await fetch('/api/performance-tracker/metadata')
        console.log('[WebPromptInputStep] API response status:', response.status)
        const data = await response.json()

        let fetchedProducts: any[] = []

        if (data.status === 'success' && data.data?.products) {
          console.log('[WebPromptInputStep] Products loaded:', data.data.products.length)
          fetchedProducts = data.data.products
        } else if (data.status === 'ok' && data.data?.products) {
          // Handle 'ok' status as well
          console.log('[WebPromptInputStep] Products loaded (ok status):', data.data.products.length)
          fetchedProducts = data.data.products
        } else {
          throw new Error('Failed to load products')
        }

        // Cache the products
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          products: fetchedProducts,
          timestamp: Date.now(),
        }))
        console.log('[WebPromptInputStep] Products cached for 24 hours')

        setProducts(fetchedProducts)
        setCacheAge(null) // Fresh data, no cache age
      } catch (err: any) {
        console.error('[WebPromptInputStep] Error fetching products:', err)
        setError('Failed to load products. Please refresh the page.')
      } finally {
        setIsLoadingProducts(false)
        console.log('[WebPromptInputStep] Finished fetching products')
      }
    }

    fetchProducts()
  }, [])

  // Clear cache and refetch
  const handleRefreshProducts = () => {
    const CACHE_KEY = 'tag-creation-products-cache'
    localStorage.removeItem(CACHE_KEY)
    setCacheAge(null)
    setProducts([])
    window.location.reload()
  }

  // Toggle product selection
  const handleToggleProduct = (productValue: string) => {
    const isSelected = selectedProducts.some((p) => p.product === productValue)

    if (isSelected) {
      setSelectedProducts(selectedProducts.filter((p) => p.product !== productValue))
    } else {
      const isBanner = productValue.toLowerCase().includes('banner')
      setSelectedProducts([
        ...selectedProducts,
        { product: productValue, quantity: isBanner ? 0 : 1, sizes: [], notes: '' },
      ])
    }
    setError(null)
  }

  // Handle product removal
  const handleRemoveProduct = (productValue: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.product !== productValue))
  }

  // Handle quantity change (for non-Banner products)
  const handleQuantityChange = (productValue: string, quantity: number) => {
    if (quantity < 1 || quantity > 99) return
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.product === productValue ? { ...p, quantity } : p
      )
    )
  }

  // Handle size toggle for Banner products
  const handleToggleSize = (productValue: string, size: string) => {
    setSelectedProducts(
      selectedProducts.map((p) => {
        if (p.product !== productValue) return p

        const currentSizes = p.sizes || []
        const hasSizeSelected = currentSizes.some(s => s.size === size)

        return {
          ...p,
          sizes: hasSizeSelected
            ? currentSizes.filter(s => s.size !== size)
            : [...currentSizes, { size, quantity: 1 }]
        }
      })
    )
  }

  // Handle size quantity change for Banner products
  const handleSizeQuantityChange = (productValue: string, size: string, quantity: number) => {
    if (quantity < 1 || quantity > 99) return
    setSelectedProducts(
      selectedProducts.map((p) => {
        if (p.product !== productValue) return p
        return {
          ...p,
          sizes: (p.sizes || []).map(s =>
            s.size === size ? { ...s, quantity } : s
          )
        }
      })
    )
  }

  // Handle adding custom size
  const handleAddCustomSize = (productValue: string) => {
    const customSize = customSizeInput[productValue]?.trim()
    if (!customSize) return

    const sizePattern = /^\d+x\d+$/
    if (!sizePattern.test(customSize)) {
      setError('Invalid size format. Use: widthxheight (e.g., 300x250)')
      return
    }

    handleToggleSize(productValue, customSize)
    setCustomSizeInput({ ...customSizeInput, [productValue]: '' })
  }

  // Add zones for selected MID
  const handleAddZones = async () => {
    // Validation
    if (!manualMid.trim()) {
      setError('Please enter a MID (Media ID)')
      return
    }

    if (!mediaName.trim()) {
      setError('Please enter Media Name')
      return
    }

    if (selectedProducts.length === 0) {
      setError('Please select at least one product')
      return
    }

    if (!payoutRate.trim()) {
      setError('Please enter a Payout Rate')
      return
    }

    const payoutRateNum = parseFloat(payoutRate)
    if (isNaN(payoutRateNum) || payoutRateNum < 0 || payoutRateNum > 1) {
      setError('Payout Rate must be a number between 0 and 1 (e.g., 0.85)')
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      const response = await fetch('/api/tools/tag-creation/generate-csv-web', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaName,
          products: selectedProducts,
          aiPrompt: aiPrompt.trim() || undefined,
          payoutRate: payoutRateNum,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate zones')
      }

      // Get zone count from response
      const zoneCount = parseInt(response.headers.get('X-Zone-Count') || '0', 10)

      // Create placeholder zones with zone count (actual CSV will be generated at the end)
      const placeholderZones: ExtractedZone[] = Array.from({ length: zoneCount }, (_, i) => ({
        zone_id: `zone_${i}`,
        zone_name: `${mediaName}_zone_${i}`,
        size: '300x250',
        payout_rate: payoutRate,
      }))

      // Notify parent (will accumulate zones - NO CSV download yet)
      if (onAddMidZones) {
        onAddMidZones(manualMid, mediaName, placeholderZones, mediaName, payoutRate)
      }

      onComplete([], undefined, mediaName, payoutRate)

      // Clear inputs for next MID
      setSelectedMid('')
      setMediaName('')
      setManualMid('') // Also clear MID input
      setSelectedProducts([])
      setAiPrompt('')
    } catch (err: any) {
      console.error('[WebPromptInputStep] Error generating zones:', err)
      setError(err.message || 'Failed to generate zones')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRemoveMid = (mid: string) => {
    if (onRemoveMid) {
      onRemoveMid(mid)
    }
  }

  const handleGenerateFinalCsv = async () => {
    // Generate CSV with ALL zones from ALL MIDs (same as App team)
    const allZones: ZoneCsvRow[] = []

    // For each MID, we need to re-generate zones to get actual data
    for (const item of midWithZones) {
      const zones = item.zones as ExtractedZone[]

      // Get mediaName from siteAppName
      const mediaName = item.siteAppName

      // Get payoutRate from first zone
      const payoutRate = zones[0]?.payout_rate || '0.85'

      zones.forEach((zone) => {
        allZones.push(extractedZoneToCsvRow(zone, item.mid, mediaName, payoutRate))
      })
    }

    if (allZones.length === 0) {
      setError('No zones to export. Please add zones first.')
      return
    }

    // Download the CSV
    downloadZoneCsv(allZones, `zones_web_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.csv`)
  }

  // Count total zones
  const totalZones = midWithZones.reduce((sum, m) => sum + (m.zones?.length || 0), 0)

  return (
    <div className="space-y-4" data-step="1">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-[#1565C0]">Step 1: Generate Zones</span>
        <span className="text-sm text-gray-400">(Optional)</span>
      </div>

      <div className="space-y-4">
        {/* MID Selector (if Step 0 data available) */}
        {availableMids.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">
              Select MID <span className="text-gray-500 font-normal">(from Step 0)</span>
            </label>
            <Select value={selectedMid} onValueChange={setSelectedMid}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a MID..." />
              </SelectTrigger>
              <SelectContent>
                {availableMids.map((media) => (
                  <SelectItem key={media.mid} value={media.mid!}>
                    {media.pubname ? `${media.mid} - ${media.pubname}` : `${media.mid} - ${media.siteAppName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* MID Input - Always Visible */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 block">
            MID (Media ID) <span className="text-red-500">*</span>
          </label>
          <Input
            value={manualMid}
            onChange={(e) => {
              setManualMid(e.target.value)
              setError(null)
            }}
            placeholder="Enter MID (e.g., 12345)"
          />
          {selectedMid && selectedMid === manualMid && (
            <p className="text-xs text-green-600">Auto-filled from Step 0</p>
          )}
        </div>

        {/* Row 1: Media Name, Payout Rate, and Products */}
        <div className="grid grid-cols-3 gap-4">
          {/* Media Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">
              Media Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={mediaName}
              onChange={(e) => {
                setMediaName(e.target.value)
                setError(null)
              }}
              placeholder="e.g., dantri.com"
              disabled={!!selectedMid && !!step0Data?.byMid[selectedMid]?.siteAppName}
            />
            {selectedMid && step0Data?.byMid[selectedMid]?.siteAppName && (
              <p className="text-xs text-green-600">Auto-filled from Step 0</p>
            )}
          </div>

          {/* Payout Rate Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">
              Payout Rate <span className="text-red-500">*</span>
            </label>
            <Input
              value={payoutRate}
              onChange={(e) => {
                setPayoutRate(e.target.value)
                setError(null)
              }}
              placeholder="0.85"
              type="text"
            />
          </div>

          {/* Product Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Products <span className="text-red-500">*</span>
              </label>
              {cacheAge !== null && !isLoadingProducts && (
                <button
                  onClick={handleRefreshProducts}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  title="Refresh products list"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>

            {isLoadingProducts ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <Popover open={productSelectorOpen} onOpenChange={setProductSelectorOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productSelectorOpen}
                    className="w-full justify-between"
                  >
                    {selectedProducts.length === 0
                      ? "Select products..."
                      : `${selectedProducts.length} product${selectedProducts.length > 1 ? 's' : ''} selected`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 pointer-events-auto" align="start" style={{ pointerEvents: 'auto' }}>
                  <Command className="pointer-events-auto">
                    <CommandInput placeholder="Search products..." />
                    <CommandEmpty>No products found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup className="max-h-64 overflow-auto pointer-events-auto" style={{ pointerEvents: 'auto' }}>
                        {products.map((product) => {
                          const isSelected = selectedProducts.some(p => p.product === product.value)
                          return (
                            <div
                              key={product.value}
                              onClick={() => handleToggleProduct(product.value)}
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            >
                              <Checkbox
                                checked={isSelected}
                                className="mr-2"
                              />
                              {product.label}
                              {isSelected && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </div>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Selected Products with Quantities and Sizes */}
        {selectedProducts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              Selected Products ({selectedProducts.length})
            </p>
            <div className="space-y-3">
              {selectedProducts.map(({ product, quantity, sizes }) => {
                const isBanner = product.toLowerCase().includes('banner')
                const sizesTotal = (sizes || []).reduce((sum, s) => sum + s.quantity, 0)
                const totalZones = isBanner ? sizesTotal + quantity : quantity

                return (
                  <div key={product} className="p-3 border border-gray-200 rounded-md space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="flex-shrink-0 bg-[gray-800] text-white font-semibold">
                        {product}
                      </Badge>

                      {isBanner && (
                        <>
                          <Popover
                            open={sizeSelectorOpen[product] || false}
                            onOpenChange={(open) => setSizeSelectorOpen({ ...sizeSelectorOpen, [product]: open })}
                            modal={true}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="h-7 justify-between text-xs w-[220px]"
                              >
                                <span className="text-gray-500">Select sizes...</span>
                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-0 pointer-events-auto" align="start" style={{ pointerEvents: 'auto' }}>
                              <Command className="pointer-events-auto">
                                <CommandInput placeholder="Search..." className="h-7 text-xs" />
                                <CommandEmpty className="text-xs py-2">No size found.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup className="max-h-48 overflow-auto pointer-events-auto" style={{ pointerEvents: 'auto' }}>
                                    {BANNER_SIZE_PRESETS.map((size) => {
                                      const isSelected = sizes?.some(s => s.size === size)
                                      return (
                                        <div
                                          key={size}
                                          onClick={() => handleToggleSize(product, size)}
                                          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1 text-xs outline-none hover:bg-accent hover:text-accent-foreground"
                                        >
                                          <Checkbox checked={isSelected} className="h-3 w-3 mr-2" />
                                          <span>{size}</span>
                                        </div>
                                      )
                                    })}
                                    <div className="relative flex select-none items-center rounded-sm px-2 py-1 text-xs outline-none border-t">
                                      <div className="w-full space-y-1">
                                        <p className="font-medium text-xs">Custom</p>
                                        <div className="flex gap-1">
                                          <Input
                                            placeholder="300x250"
                                            value={customSizeInput[product] || ''}
                                            onChange={(e) => {
                                              e.stopPropagation()
                                              setCustomSizeInput({ ...customSizeInput, [product]: e.target.value })
                                            }}
                                            onKeyDown={(e) => {
                                              e.stopPropagation()
                                              if (e.key === 'Enter') handleAddCustomSize(product)
                                            }}
                                            className="h-6 text-xs"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                          <Button
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleAddCustomSize(product)
                                            }}
                                            className="h-6 px-2"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>

                          <div className="flex items-center gap-2">
                            <label className="text-xs text-[gray-800] font-semibold">Qty:</label>
                            <Input
                              type="number"
                              min="0"
                              max="99"
                              value={quantity}
                              onChange={(e) => handleQuantityChange(product, parseInt(e.target.value, 10) || 0)}
                              className="w-16 h-7 text-xs font-semibold"
                            />
                          </div>
                        </>
                      )}

                      {!isBanner && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-[gray-800] font-semibold">Qty:</label>
                          <Input
                            type="number"
                            min="1"
                            max="99"
                            value={quantity}
                            onChange={(e) => handleQuantityChange(product, parseInt(e.target.value, 10) || 1)}
                            className="w-16 h-7 text-xs font-semibold"
                          />
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProduct(product)}
                        className="ml-auto h-7 w-7 p-0 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {isBanner && sizes && sizes.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-gray-200">
                        <div className="space-y-1">
                          {sizes.map(({ size, quantity: sizeQty }) => (
                            <div key={size} className="flex items-center gap-2 text-xs">
                              <Badge variant="secondary" className="text-xs bg-[gray-800] text-white font-semibold">
                                {size}
                              </Badge>
                              <span className="text-[gray-800] font-semibold">Qty:</span>
                              <Input
                                type="number"
                                min="1"
                                max="99"
                                value={sizeQty}
                                onChange={(e) => handleSizeQuantityChange(product, size, parseInt(e.target.value, 10) || 1)}
                                className="w-12 h-6 text-xs font-semibold"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleSize(product, size)}
                                className="h-5 w-5 p-0 ml-auto hover:bg-red-100"
                              >
                                <X className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-[gray-800] font-semibold pt-1">
                          → {totalZones} zone{totalZones > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* AI Prompt (Optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 block">
            AI Instructions <span className="text-xs text-gray-500 font-normal">(Optional)</span>
          </label>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g., Add extra zones with custom naming"
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600">
            <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {/* Add Zones Button */}
        <Button
          onClick={handleAddZones}
          disabled={isGenerating || !mediaName.trim() || selectedProducts.length === 0 || !payoutRate.trim()}
          size="lg"
          className="w-full bg-[gray-800] hover:bg-[#0D47A1] text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Zones...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Zones{selectedMid ? ` for ${selectedMid}` : ''}
            </>
          )}
        </Button>

        {/* Added MIDs List */}
        {midWithZones.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700">
              Added MIDs ({midWithZones.length}):
            </p>
            <div className="space-y-2">
              {midWithZones.map((item) => (
                <div key={item.mid} className="flex items-center justify-between p-2 border border-gray-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-[gray-800] text-white">
                      {item.mid}
                    </Badge>
                    <span className="text-sm text-gray-700">{item.siteAppName}</span>
                    <span className="text-xs text-gray-500">
                      ({item.zones?.length || 0} zones)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMid(item.mid)}
                    className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            {totalZones > 0 && (
              <p className="text-xs text-gray-500">
                Total: {totalZones} zones across {midWithZones.length} MID{midWithZones.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Generate Final CSV Button */}
        {midWithZones.length > 0 && (
          <Button
            onClick={handleGenerateFinalCsv}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Generate & Download CSV (All MIDs)
          </Button>
        )}
      </div>
    </div>
  )
}
