'use client'

/**
 * Pipeline Selector Table
 * Table showing filtered results with selection checkboxes for Focus suggestions
 */

import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface FilterPipelineResult {
  pid: number
  pubname: string
  mid: number
  medianame: string
  pic: string
  targeted_product: string // The product being targeted (single value)
  rev_p1: number
  req_p1: number
  paid_p1: number
  ecpm_p1: number
  already_in_focus: boolean
  has_active_pipeline: boolean
}

interface PipelineSelectorTableProps {
  results: FilterPipelineResult[]
  selectedMids: Set<number>
  onSelectionChange: (selectedMids: Set<number>) => void
}

// Format number helpers
function formatRevenue(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  } else {
    return `$${value.toFixed(0)}`
  }
}

function formatRequests(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  } else {
    return value.toLocaleString()
  }
}

export function PipelineSelectorTable({
  results,
  selectedMids,
  onSelectionChange,
}: PipelineSelectorTableProps) {
  const handleRowToggle = (mid: number, isDisabled: boolean) => {
    if (isDisabled) return

    const newSelection = new Set(selectedMids)
    if (newSelection.has(mid)) {
      newSelection.delete(mid)
    } else {
      newSelection.add(mid)
    }
    onSelectionChange(newSelection)
  }

  const handleSelectAll = () => {
    const enabledMids = results
      .filter((r) => !r.already_in_focus)
      .map((r) => r.mid)

    if (selectedMids.size === enabledMids.length && selectedMids.size > 0) {
      onSelectionChange(new Set()) // Deselect all
    } else {
      onSelectionChange(new Set(enabledMids)) // Select all enabled
    }
  }

  // Check if all enabled rows are selected
  const enabledCount = results.filter((r) => !r.already_in_focus).length
  const allEnabledSelected = enabledCount > 0 && selectedMids.size === enabledCount

  // Empty state
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <p className="text-gray-600 font-medium">No results found</p>
          <p className="text-sm text-gray-500 mt-1">
            Try adjusting your filters or date range
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allEnabledSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={enabledCount === 0}
                />
              </TableHead>
              <TableHead className="w-24">MID</TableHead>
              <TableHead>Media Name</TableHead>
              <TableHead className="w-32">PIC</TableHead>
              <TableHead className="w-48">Targeted Product</TableHead>
              <TableHead className="w-28 text-right">Revenue</TableHead>
              <TableHead className="w-28 text-right">Requests</TableHead>
              <TableHead className="w-32">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => {
              const isDisabled = result.already_in_focus
              const isSelected = selectedMids.has(result.mid)

              return (
                <TableRow
                  key={result.mid}
                  className={`
                    ${isDisabled ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50 cursor-pointer'}
                    ${isSelected && !isDisabled ? 'bg-blue-50' : ''}
                  `}
                  onClick={() => handleRowToggle(result.mid, isDisabled)}
                >
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Checkbox
                              checked={isSelected}
                              disabled={isDisabled}
                              onCheckedChange={() => handleRowToggle(result.mid, isDisabled)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </TooltipTrigger>
                        {isDisabled && (
                          <TooltipContent>
                            <p>Already in Focus</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>

                  <TableCell className="font-mono text-xs text-gray-600">
                    {result.mid}
                  </TableCell>

                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="truncate max-w-[200px]">
                            {result.medianame || result.pubname || 'N/A'}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{result.medianame || result.pubname || 'N/A'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>

                  <TableCell className="text-sm">{result.pic || 'N/A'}</TableCell>

                  <TableCell>
                    {result.targeted_product ? (
                      <Badge variant="default" className="text-xs">
                        {result.targeted_product}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right font-medium">
                    {formatRevenue(result.rev_p1)}
                  </TableCell>

                  <TableCell className="text-right text-sm text-gray-600">
                    {formatRequests(result.req_p1)}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {result.already_in_focus && (
                        <Badge variant="secondary" className="text-xs">
                          In Focus
                        </Badge>
                      )}
                      {result.has_active_pipeline && (
                        <Badge
                          variant="outline"
                          className="text-xs border-blue-300 text-blue-700"
                        >
                          Has Pipeline
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Selection summary */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
        Selected: <span className="font-medium">{selectedMids.size}</span> /{' '}
        {results.length}
        {enabledCount < results.length && (
          <span className="ml-2 text-gray-500">
            ({results.length - enabledCount} disabled)
          </span>
        )}
      </div>
    </div>
  )
}
