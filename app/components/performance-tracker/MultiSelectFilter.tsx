'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { colors } from '../../../lib/colors'

interface MultiSelectFilterProps {
  label: string
  options: Array<{ label: string; value: string }>
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  compact?: boolean
  disabled?: boolean
}

export function MultiSelectFilter({
  label,
  options,
  value = [],
  onChange,
  placeholder,
  compact = false,
  disabled = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [options, searchQuery])

  const allSelected = value.length === options.length && options.length > 0
  const someSelected = value.length > 0 && value.length < options.length

  const handleSelectAll = () => {
    if (allSelected) {
      onChange([])
    } else {
      onChange(options.map((opt) => opt.value))
    }
  }

  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onChange(newValue)
  }

  const selectedLabels = React.useMemo(() => {
    if (value.length === 0) return label  // Show filter name instead of 'All'
    if (value.length === options.length) return 'All selected'
    if (value.length <= 2) {
      return value
        .map((v) => options.find((opt) => opt.value === v)?.label)
        .filter(Boolean)
        .join(', ')
    }
    return `${value.length} selected`
  }, [value, options, label])

  return (
    <div>
      {!compact && label && (
        <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text.secondary }}>
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal hover:bg-gray-50 transition-colors border-gray-300",
              compact && "h-8 text-xs"
            )}
            style={{
              backgroundColor: disabled ? colors.surface.muted : colors.surface.card,
              color: colors.text.primary,
            }}
          >
            <span className={cn("truncate", compact ? "text-xs" : "text-sm")}>{selectedLabels}</span>
            <ChevronsUpDown className={cn("ml-2 shrink-0 text-gray-400", compact ? "h-3 w-3" : "h-4 w-4")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] p-0 pointer-events-auto"
          align="start"
          side="bottom"
          style={{ pointerEvents: 'auto' }}
          sideOffset={5}
        >
          <Command shouldFilter={false} className="pointer-events-auto">
            <div className="flex items-center border-b px-3 pointer-events-auto" style={{ borderColor: colors.neutralLight }}>
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search..."
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 pointer-events-auto"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <CommandGroup
              className="max-h-[300px] overflow-y-auto overscroll-contain pointer-events-auto"
              style={{ pointerEvents: 'auto' }}
            >
              {options.length === 0 ? (
                <div className="py-6 text-center text-sm" style={{ color: colors.text.secondary }}>
                  No data available
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm" style={{ color: colors.text.secondary }}>
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <>
                  {/* Select All Option */}
                  <div
                    onClick={handleSelectAll}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  >
                    <Checkbox
                      checked={someSelected ? 'indeterminate' : allSelected}
                      className="mr-2"
                    />
                    <span className="font-medium">Select All</span>
                  </div>

                  {/* Individual Options */}
                  {filteredOptions.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => handleToggle(option.value)}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    >
                      <Checkbox
                        checked={value.includes(option.value)}
                        className="mr-2"
                      />
                      {option.label}
                    </div>
                  ))}
                </>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
