'use client'

import { Button } from '@/components/ui/button'
import { colors } from '../../../lib/colors'

export type DatePreset = 'all-time' | 'last-30-days' | 'last-3-months' | 'last-6-months' | 'custom'

interface DatePresetButtonsProps {
  selectedPreset: DatePreset
  onPresetChange: (preset: DatePreset) => void
}

export function DatePresetButtons({ selectedPreset, onPresetChange }: DatePresetButtonsProps) {
  const presets: { value: DatePreset; label: string }[] = [
    { value: 'all-time', label: 'All Time' },
    { value: 'last-30-days', label: 'Last 30 Days' },
    { value: 'last-3-months', label: 'Last 3 Months' },
    { value: 'last-6-months', label: 'Last 6 Months' },
    { value: 'custom', label: 'Custom Range' },
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <span className="text-sm font-medium text-gray-700 self-center mr-2">Quick Filters:</span>
      {presets.map((preset) => (
        <Button
          key={preset.value}
          onClick={() => onPresetChange(preset.value)}
          variant={selectedPreset === preset.value ? 'default' : 'outline'}
          size="sm"
          style={
            selectedPreset === preset.value
              ? {
                  backgroundColor: colors.main,
                  color: colors.contrast,
                  borderColor: colors.main,
                }
              : {
                  color: colors.main,
                  borderColor: colors.main,
                }
          }
          className="hover:opacity-80"
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
