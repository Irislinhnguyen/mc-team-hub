'use client'

import { useState } from 'react'
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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

interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onStartDateChange: (date: Date | undefined) => void
  onEndDateChange: (date: Date | undefined) => void
  label?: string
}

type DateRangePreset = {
  label: string
  value: string
  getRange: () => { start: Date; end: Date }
}

const dateRangePresets: DateRangePreset[] = [
  {
    label: 'Today',
    value: 'today',
    getRange: () => ({
      start: startOfDay(new Date()),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Yesterday',
    value: 'yesterday',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 1)),
      end: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    label: 'Last 7 days',
    value: 'last7days',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 6)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 30 days',
    value: 'last30days',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 29)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'This month',
    value: 'thismonth',
    getRange: () => ({
      start: startOfMonth(new Date()),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last month',
    value: 'lastmonth',
    getRange: () => {
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      }
    },
  },
]

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = 'Select date',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startDate)
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endDate)
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value)
    const preset = dateRangePresets.find((p) => p.value === value)
    if (preset) {
      const range = preset.getRange()
      setTempStartDate(range.start)
      setTempEndDate(range.end)
    }
  }

  const handleApply = () => {
    onStartDateChange(tempStartDate)
    onEndDateChange(tempEndDate)
    setOpen(false)
  }

  const handleCancel = () => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
    setSelectedPreset('')
    setOpen(false)
  }

  const displayText =
    startDate && endDate
      ? `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
      : label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal hover:bg-gray-50 transition-colors border-gray-300"
          style={{ fontSize: '14px' }}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-700">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        style={{
          transform: 'scale(0.65)',
          transformOrigin: 'top left'
        }}
      >
        <div className="p-4 space-y-4">
          {/* Auto Date Range Preset */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ fontSize: '14px' }}>
              Auto date range
            </label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full" style={{ fontSize: '14px' }}>
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                {dateRangePresets.map((preset) => (
                  <SelectItem
                    key={preset.value}
                    value={preset.value}
                    style={{ fontSize: '14px' }}
                  >
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dual Calendars */}
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ fontSize: '14px' }}>
                Start Date
              </label>
              <Calendar
                mode="single"
                selected={tempStartDate}
                onSelect={setTempStartDate}
                disabled={(date) =>
                  date > new Date() || (tempEndDate ? date > tempEndDate : false)
                }
                initialFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ fontSize: '14px' }}>
                End Date
              </label>
              <Calendar
                mode="single"
                selected={tempEndDate}
                onSelect={setTempEndDate}
                disabled={(date) =>
                  date > new Date() || (tempStartDate ? date < tempStartDate : false)
                }
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              style={{ fontSize: '14px' }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-700"
              style={{ fontSize: '14px' }}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
