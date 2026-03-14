'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

interface Entity {
  id: string | number
  label: string
  value: string | number
}

interface EntitySelectorProps {
  entityType: 'publisher' | 'zone' | 'format'
  selectedEntities: string[]
  onSelectionChange: (entities: string[]) => void
  label?: string
  placeholder?: string
  multi?: boolean
  loading?: boolean
}

export function EntitySelector({
  entityType,
  selectedEntities,
  onSelectionChange,
  label = 'Select entities',
  placeholder = 'Search and select...',
  multi = true,
  loading = false,
}: EntitySelectorProps) {
  const [open, setOpen] = useState(false)
  const [entities, setEntities] = useState<Entity[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Map entity type to API endpoint
  const getEndpoint = () => {
    switch (entityType) {
      case 'publisher':
        return '/api/metadata/publishers'
      case 'zone':
        return '/api/metadata/zones'
      case 'format':
        return '/api/metadata/formats'
      default:
        return '/api/metadata/publishers'
    }
  }

  // Fetch entities when component mounts or entityType changes
  useEffect(() => {
    const fetchEntities = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(getEndpoint())
        if (response.ok) {
          const result = await response.json()
          setEntities(result.data || [])
        }
      } catch (error) {
        console.error('Error fetching entities:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEntities()
  }, [entityType])

  const handleSelect = (value: string) => {
    if (multi) {
      const newSelection = selectedEntities.includes(value)
        ? selectedEntities.filter((v) => v !== value)
        : [...selectedEntities, value]
      onSelectionChange(newSelection)
    } else {
      onSelectionChange([value])
      setOpen(false)
    }
  }

  const handleRemove = (value: string) => {
    const newSelection = selectedEntities.filter((v) => v !== value)
    onSelectionChange(newSelection)
  }

  const selectedLabels = selectedEntities
    .map((id) => entities.find((e) => String(e.value) === id)?.label || id)
    .filter(Boolean)

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isLoading}
          >
            <span className="truncate text-left">
              {selectedEntities.length === 0
                ? placeholder
                : `${selectedEntities.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandEmpty>
              {isLoading ? 'Loading...' : 'No results found.'}
            </CommandEmpty>
            <CommandList>
              <CommandGroup>
                {entities.map((entity) => (
                  <CommandItem
                    key={entity.value}
                    value={String(entity.value)}
                    onSelect={() => handleSelect(String(entity.value))}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedEntities.includes(String(entity.value))
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    {entity.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected entities as chips */}
      {selectedEntities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLabels.map((label, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm"
            >
              <span>{label}</span>
              <button
                type="button"
                onClick={() => handleRemove(selectedEntities[index])}
                className="ml-1 hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
