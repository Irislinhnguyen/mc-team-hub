'use client'

import { Card, CardContent } from '@/src/components/ui/card'
import { Label } from '@/src/components/ui/label'
import { Button } from '@/src/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover'
import { Checkbox } from '@/src/components/ui/checkbox'
import { Input } from '@/src/components/ui/input'
import { cn } from '@/lib/utils'
import { ChevronDown, Search } from 'lucide-react'
import { useState } from 'react'

interface FilterPanelProps {
  teams: Array<{ team_id: string; team_name: string }>
  filterTeams: string[]
  setFilterTeams: (teams: string[]) => void
  uniquePICs: string[]
  filterPICs: string[]
  setFilterPICs: (pics: string[]) => void
  uniqueProducts: string[]
  filterProducts: string[]
  setFilterProducts: (products: string[]) => void
  filterSlotTypes: string[]
  setFilterSlotTypes: (slotTypes: string[]) => void
  uniqueStatuses: string[]
  filterStatuses: string[]
  setFilterStatuses: (statuses: string[]) => void
  filteredCount: number
  totalCount: number
  onClear: () => void
}

export function FilterPanel({
  teams,
  filterTeams,
  setFilterTeams,
  uniquePICs,
  filterPICs,
  setFilterPICs,
  uniqueProducts,
  filterProducts,
  setFilterProducts,
  filterSlotTypes,
  setFilterSlotTypes,
  uniqueStatuses,
  filterStatuses,
  setFilterStatuses,
  filteredCount,
  totalCount,
  onClear
}: FilterPanelProps) {
  const [teamSearch, setTeamSearch] = useState('')
  const [picSearch, setPicSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [statusSearch, setStatusSearch] = useState('')

  const activeFilterCount =
    (filterTeams.length > 0 ? 1 : 0) +
    (filterPICs.length > 0 ? 1 : 0) +
    (filterProducts.length > 0 ? 1 : 0) +
    (filterSlotTypes.length > 0 ? 1 : 0) +
    (filterStatuses.length > 0 ? 1 : 0)

  const filteredTeams = (teams || []).filter(team =>
    team.team_name.toLowerCase().includes(teamSearch.toLowerCase())
  )

  const filteredPICs = (uniquePICs || []).filter(pic =>
    pic.toLowerCase().includes(picSearch.toLowerCase())
  )

  const filteredProductsList = (uniqueProducts || []).filter(product =>
    product.toLowerCase().includes(productSearch.toLowerCase())
  )

  const filteredStatuses = (uniqueStatuses || []).filter(status =>
    status.toLowerCase().includes(statusSearch.toLowerCase())
  )

  return (
    <Card className="border-gray-200 bg-gray-50">
      <CardContent className="py-4">
        <div className="space-y-4">
          {/* Filter Controls Row */}
          <div className="flex flex-wrap gap-4 items-end">
            {/* Team Filter */}
            <div className="min-w-[180px]">
              <Label className="text-xs font-medium text-gray-700 mb-2 block">
                Team
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between",
                      filterTeams.length > 0 && "border-[#1565C0] text-[#1565C0] bg-blue-50"
                    )}
                  >
                    <span>
                      {filterTeams.length === 0
                        ? 'All Teams'
                        : `${filterTeams.length} selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search teams..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {filteredTeams.map(team => (
                        <div key={team.team_id} className="flex items-center gap-2">
                          <Checkbox
                            id={team.team_id}
                            checked={filterTeams.includes(team.team_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilterTeams([...filterTeams, team.team_id])
                              } else {
                                setFilterTeams(filterTeams.filter(t => t !== team.team_id))
                              }
                            }}
                          />
                          <label htmlFor={team.team_id} className="text-sm cursor-pointer">
                            {team.team_name}
                          </label>
                        </div>
                      ))}
                      {filteredTeams.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-2">No teams found</p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* PIC Filter */}
            <div className="min-w-[180px]">
              <Label className="text-xs font-medium text-gray-700 mb-2 block">
                Person in Charge
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between",
                      filterPICs.length > 0 && "border-[#1565C0] text-[#1565C0] bg-blue-50"
                    )}
                  >
                    <span>
                      {filterPICs.length === 0
                        ? 'All PICs'
                        : `${filterPICs.length} selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search PICs..."
                        value={picSearch}
                        onChange={(e) => setPicSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {filteredPICs.map(pic => (
                        <div key={pic} className="flex items-center gap-2">
                          <Checkbox
                            id={`pic-${pic}`}
                            checked={filterPICs.includes(pic)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilterPICs([...filterPICs, pic])
                              } else {
                                setFilterPICs(filterPICs.filter(p => p !== pic))
                              }
                            }}
                          />
                          <label htmlFor={`pic-${pic}`} className="text-sm cursor-pointer">
                            {pic}
                          </label>
                        </div>
                      ))}
                      {filteredPICs.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-2">No PICs found</p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Product Filter */}
            <div className="min-w-[180px]">
              <Label className="text-xs font-medium text-gray-700 mb-2 block">
                Product
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between",
                      filterProducts.length > 0 && "border-[#1565C0] text-[#1565C0] bg-blue-50"
                    )}
                  >
                    <span>
                      {filterProducts.length === 0
                        ? 'All Products'
                        : `${filterProducts.length} selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {filteredProductsList.map(product => (
                        <div key={product} className="flex items-center gap-2">
                          <Checkbox
                            id={`product-${product}`}
                            checked={filterProducts.includes(product)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilterProducts([...filterProducts, product])
                              } else {
                                setFilterProducts(filterProducts.filter(p => p !== product))
                              }
                            }}
                          />
                          <label htmlFor={`product-${product}`} className="text-sm cursor-pointer">
                            {product}
                          </label>
                        </div>
                      ))}
                      {filteredProductsList.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-2">No products found</p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Slot Type Filter */}
            <div className="min-w-[180px]">
              <Label className="text-xs font-medium text-gray-700 mb-2 block">
                Slot Type
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between",
                      filterSlotTypes.length > 0 && "border-[#1565C0] text-[#1565C0] bg-blue-50"
                    )}
                  >
                    <span>
                      {filterSlotTypes.length === 0
                        ? 'All Slot Types'
                        : `${filterSlotTypes.length} selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <div className="space-y-2">
                      {[
                        { value: 'new', label: 'New Slot' },
                        { value: 'existing', label: 'Existing Slot' }
                      ].map(slotType => (
                        <div key={slotType.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`slottype-${slotType.value}`}
                            checked={filterSlotTypes.includes(slotType.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilterSlotTypes([...filterSlotTypes, slotType.value])
                              } else {
                                setFilterSlotTypes(filterSlotTypes.filter(t => t !== slotType.value))
                              }
                            }}
                          />
                          <label htmlFor={`slottype-${slotType.value}`} className="text-sm cursor-pointer">
                            {slotType.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Status Filter */}
            <div className="min-w-[180px]">
              <Label className="text-xs font-medium text-gray-700 mb-2 block">
                Status
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between",
                      filterStatuses.length > 0 && "border-[#1565C0] text-[#1565C0] bg-blue-50"
                    )}
                  >
                    <span>
                      {filterStatuses.length === 0
                        ? 'All Statuses'
                        : `${filterStatuses.length} selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search statuses..."
                        value={statusSearch}
                        onChange={(e) => setStatusSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {filteredStatuses.map(status => (
                        <div key={status} className="flex items-center gap-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={filterStatuses.includes(status)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilterStatuses([...filterStatuses, status])
                              } else {
                                setFilterStatuses(filterStatuses.filter(s => s !== status))
                              }
                            }}
                          />
                          <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                            {status}
                          </label>
                        </div>
                      ))}
                      {filteredStatuses.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-2">No statuses found</p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear Button */}
            {activeFilterCount > 0 && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClear}
                  className="h-9 border-[#1565C0] text-[#1565C0] hover:bg-blue-50"
                >
                  Clear ({filteredCount}/{totalCount})
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
