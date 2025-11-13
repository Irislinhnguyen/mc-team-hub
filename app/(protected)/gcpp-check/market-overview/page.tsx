'use client'

import { Suspense, useRef, useState } from 'react'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { DateModeToggle } from '../../../components/gcpp-check/DateModeToggle'
import { DateSelector } from '../../../components/gcpp-check/DateSelector'

// TEST 2+3: Add AnalyticsPageLayout + DateModeToggle + DateSelector
function MarketOverviewPageContent() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single')
  const [selectedDate, setSelectedDate] = useState<string>('')

  const handleDateModeChange = (mode: 'single' | 'range') => {
    setDateMode(mode)
  }

  const handleSingleDateChange = (date: string) => {
    setSelectedDate(date)
  }

  return (
    <AnalyticsPageLayout
      title="Market Overview"
      showExport={true}
      contentRef={contentRef}
    >
      <div className="flex items-center gap-4 mb-6">
        <DateModeToggle mode={dateMode} onModeChange={handleDateModeChange} />
        <DateSelector
          mode={dateMode}
          onDateChange={handleSingleDateChange}
          initialDate={selectedDate}
        />
      </div>

      <div className="p-8">
        <h1 className="text-2xl font-bold">GCPP Check - Market Overview</h1>
        <p className="mt-4 text-green-600 font-semibold">✅ TEST 2+3: AnalyticsPageLayout + Date components</p>
        <p className="mt-2">Date Mode: {dateMode}, Selected: {selectedDate || 'none'}</p>
        <p className="mt-2">If you see this without crash, these components are OK.</p>
        <p className="mt-4 text-sm text-gray-600">
          Next: Will add MetadataFilterPanel (prime suspect).
        </p>
      </div>
    </AnalyticsPageLayout>
  )
}

export default function MarketOverviewPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <MarketOverviewPageContent />
    </Suspense>
  )
}
