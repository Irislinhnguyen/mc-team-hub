'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Plus, X, CheckCircle2, Check, ChevronsUpDown } from 'lucide-react'
import type { ExtractedZone, ProductSelection } from '@/lib/types/tools'
import { HelpIcon } from './HelpIcon'

interface WebPromptInputStepProps {
  onComplete: (zones: ExtractedZone[], appId?: string, appstoreUrl?: string, payoutRate?: string) => void
  onValuesChange?: (domain: string, payoutRate: string) => void
}

// Banner size presets
const BANNER_SIZE_PRESETS = [
  '300x250',
  '728x90',
  '320x50',
  '468x60',
  '970x250',
]

export function WebPromptInputStep({ onComplete, onValuesChange }: WebPromptInputStepProps) {
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
    // Trigger re-fetch by forcing useEffect
    window.location.reload()
  }

  // Toggle product selection
  const handleToggleProduct = (productValue: string) => {
    const isSelected = selectedProducts.some((p) => p.product === productValue)

    if (isSelected) {
      // Remove product
      setSelectedProducts(selectedProducts.filter((p) => p.product !== productValue))
    } else {
      // Add product with default quantity (0 for banners, 1 for others), empty sizes, and empty notes
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

    // Validate format: widthxheight (e.g., 300x250)
    const sizePattern = /^\d+x\d+$/
    if (!sizePattern.test(customSize)) {
      setError('Invalid size format. Use: widthxheight (e.g., 300x250)')
      return
    }

    // Add the custom size
    handleToggleSize(productValue, customSize)

    // Clear custom input
    setCustomSizeInput({ ...customSizeInput, [productValue]: '' })
  }

  // Generate CSV file and download
  const handleGenerateCSV = async () => {
    // Validation
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

    // Validate payout rate
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
        throw new Error(data.error || 'Failed to generate CSV')
      }

      // Get zone count from header
      const zoneCount = parseInt(response.headers.get('X-Zone-Count') || '0', 10)

      // Download the CSV file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zones_web_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Move to Step 2 with empty zones array (zones will come from OCR)
      onComplete([], undefined, mediaName, payoutRate)
    } catch (err: any) {
      console.error('[WebPromptInputStep] Error generating CSV:', err)
      setError(err.message || 'Failed to generate CSV')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="border border-gray-100">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center">
            1
          </div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base text-[#1565C0]">Generate Zone CSV</CardTitle>
            <HelpIcon
              title="How to use (Team Web - Step 1)"
              content={`Step 1: Generate zone CSV file

1. Enter Media Name (required) - used as prefix
2. Select products (multi-select with search)
3. For Banner: optionally choose sizes and set quantity for each size
4. For other products: set quantity
5. Set Payout Rate (default: 0.85)
6. (Optional) Add AI instructions for special naming cases
7. Click "Generate & Download CSV"

Zone naming format:
- {medianame}_{product}_{size}_{number} (for banners with sizes)
- {medianame}_{product}_{number} (for non-banner products)
- Number suffix only added when quantity > 1

Example output:
- dantri.com_standardbanner_300x250 (qty=1)
- dantri.com_standardbanner_300x250_1 (qty=2+)
- dantri.com_standardbanner_300x250_2
- dantri.com_interstitial (qty=1)

Next steps:
1. Upload CSV to your ad platform to create zones
2. Take screenshots of the zones (with Zone IDs)
3. Upload screenshots in Step 2 to extract Zone IDs`}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
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
            />
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

          {/* Product Selector (Multi-select with Search) */}
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
            <>
              {/* Multi-select Popover */}
              <Popover open={productSelectorOpen} onOpenChange={setProductSelectorOpen}>
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
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandEmpty>No products found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {products.map((product) => {
                        const isSelected = selectedProducts.some(p => p.product === product.value)
                        return (
                          <CommandItem
                            key={product.value}
                            onSelect={() => handleToggleProduct(product.value)}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="mr-2"
                            />
                            {product.label}
                            {isSelected && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </>
          )}
          </div>
        </div>

        {/* Selected Products with Quantities and Sizes (Full Width) */}
        {selectedProducts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              Selected Products ({selectedProducts.length})
            </p>
            <div className="space-y-3">
              {selectedProducts.map(({ product, quantity, sizes, notes }) => {
                      const isBanner = product.toLowerCase().includes('banner')
                      const sizesTotal = (sizes || []).reduce((sum, s) => sum + s.quantity, 0)
                      // For banners: if both quantity and sizes exist, add them together
                      const totalZones = isBanner
                        ? sizesTotal + quantity
                        : quantity

                      return (
                        <div
                          key={product}
                          className="p-3 bg-gray-50 rounded-md space-y-2"
                        >
                          {/* Product name, banner sizes (inline), and remove button */}
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="flex-shrink-0 bg-[#1565C0] text-white font-semibold">
                              {product}
                            </Badge>

                            {/* For Banner: show sizes dropdown and quantity */}
                            {isBanner && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Popover
                                    open={sizeSelectorOpen[product] || false}
                                    onOpenChange={(open) => setSizeSelectorOpen({ ...sizeSelectorOpen, [product]: open })}
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
                                  <PopoverContent className="w-[220px] p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Search..." className="h-7 text-xs" />
                                      <CommandEmpty className="text-xs py-2">No size found.</CommandEmpty>
                                      <CommandGroup className="max-h-48 overflow-auto">
                                        {BANNER_SIZE_PRESETS.map((size) => {
                                          const isSelected = sizes?.some(s => s.size === size)
                                          return (
                                            <CommandItem
                                              key={size}
                                              value={size}
                                              onSelect={() => {
                                                handleToggleSize(product, size)
                                              }}
                                              className="text-xs py-1"
                                            >
                                              <div className="flex items-center gap-2 w-full">
                                                <Checkbox checked={isSelected} className="h-3 w-3" />
                                                <span>{size}</span>
                                              </div>
                                            </CommandItem>
                                          )
                                        })}

                                        {/* Custom Size Option */}
                                        <CommandItem
                                          value="custom"
                                          onSelect={(e) => {
                                            e.preventDefault()
                                          }}
                                          className="text-xs border-t py-1"
                                        >
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
                                                  if (e.key === 'Enter') {
                                                    handleAddCustomSize(product)
                                                  }
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
                                        </CommandItem>
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                </div>

                                {/* Banner quantity (always show, defaults to 0 if no sizes) */}
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-[#1565C0] font-semibold">Qty:</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={quantity}
                                    onChange={(e) =>
                                      handleQuantityChange(product, parseInt(e.target.value, 10) || 0)
                                    }
                                    className="w-16 h-7 text-xs font-semibold"
                                  />
                                </div>
                              </>
                            )}

                            {/* For non-Banner: show quantity input */}
                            {!isBanner && (
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-[#1565C0] font-semibold">Qty:</label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="99"
                                  value={quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(product, parseInt(e.target.value, 10) || 1)
                                  }
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

                          {/* Selected Sizes Display (for Banner only) */}
                          {isBanner && sizes && sizes.length > 0 && (
                            <div className="space-y-1 pt-2 border-t border-gray-200">
                              <div className="space-y-1">
                                {sizes.map(({ size, quantity: sizeQty }) => (
                                  <div key={size} className="flex items-center gap-2 text-xs">
                                    <Badge variant="secondary" className="text-xs bg-[#1565C0] text-white font-semibold">
                                      {size}
                                    </Badge>
                                    <span className="text-[#1565C0] font-semibold">Qty:</span>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="99"
                                      value={sizeQty}
                                      onChange={(e) =>
                                        handleSizeQuantityChange(product, size, parseInt(e.target.value, 10) || 1)
                                      }
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
                              <p className="text-xs text-[#1565C0] font-semibold pt-1">
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
            AI Instructions <span className="text-xs text-gray-500 font-normal">(Optional - for special cases)</span>
          </label>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g., Add extra zones with custom naming, or modify the standard format"
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

        {/* Generate CSV Button */}
        <Button
          onClick={handleGenerateCSV}
          size="lg"
          className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white"
          disabled={selectedProducts.length === 0 || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {aiPrompt.trim() ? 'AI is generating CSV...' : 'Generating CSV...'}
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Generate & Download CSV {aiPrompt.trim() && '(with AI)'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
