'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys, cacheConfig } from '../../../lib/config/queryClient'
import { DateRangePicker } from '../forms/DateRangePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { format } from 'date-fns'

interface DateSelectorProps {
  mode: 'single' | 'range'
  onDateChange?: (date: string) => void
  onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void
  onLoadingChange?: (loading: boolean) => void
  initialDate?: string
  initialStartDate?: Date | null
  initialEndDate?: Date | null
}

export function DateSelector({
  mode,
  onDateChange,
  onDateRangeChange,
  onLoadingChange,
  initialDate,
  initialStartDate = null,
  initialEndDate = null
}: DateSelectorProps) {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || '')
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate)
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate)

  // Fetch available dates using React Query (cached for 15 minutes)
  const { data: datesData, isLoading: loading } = useQuery({
    queryKey: queryKeys.gcppAvailableDates(),
    queryFn: async () => {
      const response = await fetch('/api/gcpp-check/available-dates')
      if (!response.ok) {
        throw new Error('Failed to fetch available dates')
      }
      const result = await response.json()
      if (result.status === 'ok') {
        return result.data
      }
      throw new Error(result.message || 'Unknown error')
    },
    staleTime: cacheConfig.availableDates.staleTime,
    gcTime: cacheConfig.availableDates.gcTime,
  })

  const availableDates = datesData?.dates || []

  // Auto-select latest date on first load if no initial date (single mode)
  useEffect(() => {
    if (mode === 'single' && !initialDate && datesData?.latestDate && !selectedDate) {
      setSelectedDate(datesData.latestDate)
      onDateChange?.(datesData.latestDate)
    }
  }, [mode, datesData, initialDate, selectedDate, onDateChange])

  // Auto-initialize date range with last 30 days (range mode)
  useEffect(() => {
    if (mode === 'range' && !startDate && !endDate) {
      const defaultEnd = new Date()
      const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      setStartDate(defaultStart)
      setEndDate(defaultEnd)
      onDateRangeChange?.(defaultStart, defaultEnd)
    }
  }, [mode, startDate, endDate, onDateRangeChange])

  // Report loading state to parent
  useEffect(() => {
    onLoadingChange?.(loading)
  }, [loading, onLoadingChange])

  // Handle single date selection
  const handleSingleDateChange = (date: string) => {
    setSelectedDate(date)
    onDateChange?.(date)
  }

  // Handle date range selection
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date)
    onDateRangeChange?.(date, endDate)
  }

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date)
    onDateRangeChange?.(startDate, date)
  }

  // Format date for display (YYYY-MM-DD)
  const formatDisplayDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + 'T00:00:00') // Add time to avoid timezone issues
      return format(date, 'yyyy-MM-dd')
    } catch {
      return dateStr
    }
  }

  if (mode === 'single') {
    return (
      <div className="flex-shrink-0">
        <Select
          value={selectedDate}
          onValueChange={handleSingleDateChange}
          disabled={loading}
        >
          <SelectTrigger className="w-[200px] h-10">
            <SelectValue placeholder={loading ? 'Loading dates...' : 'Select a date'} />
          </SelectTrigger>
          <SelectContent>
            {availableDates.map((date) => (
              <SelectItem key={date} value={date}>
                {formatDisplayDate(date)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  // Range mode
  return (
    <div className="flex-shrink-0">
      <DateRangePicker
        startDate={startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
        endDate={endDate || new Date()}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        label="Select Date Range"
      />
    </div>
  )
}
