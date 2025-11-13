'use client'

import { Suspense, useRef, useState } from 'react'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { DateModeToggle } from '../../../components/gcpp-check/DateModeToggle'
import { DateSelector } from '../../../components/gcpp-check/DateSelector'
import { MetadataFilterPanel } from '../../../components/performance-tracker/MetadataFilterPanel'
import { useGCPPFilters } from '../../../../lib/hooks'

// TEST 4: Add MetadataFilterPanel + hooks (NO CHARTS YET)
function MarketOverviewPageContent() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const { filters, setMetadataFilters, setDateFilters } = useGCPPFilters({})

  const handleDateModeChange = (mode: 'single' | 'range') => {
    setDateMode(mode)
    setDateFilters({})
  }

  const handleSingleDateChange = (date: string) => {
    setSelectedDate(date)
    setDateFilters({ date })
  }

  const handleMetadataFilterChange = (newFilters: Record<string, any>) => {
    setMetadataFilters(newFilters)
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

      <MetadataFilterPanel
        page="gcpp-market-overview"
        filterFields={['team', 'partner', 'market']}
        onFilterChange={handleMetadataFilterChange}
        isLoading={false}
        metadataEndpoint="/api/gcpp-check/metadata"
      />

      <div className="p-8 mt-6">
        <h1 className="text-2xl font-bold">GCPP Check - Market Overview</h1>
        <p className="mt-4 text-orange-600 font-semibold">⚠️ TEST 4: With MetadataFilterPanel (NO CHARTS)</p>
        <p className="mt-2">Filters: {JSON.stringify(filters)}</p>
        <p className="mt-2">If this works, MetadataFilterPanel is OK. If crashes, MetadataFilterPanel is the issue.</p>
        <p className="mt-4 text-sm text-gray-600">
          Next: Will add charts one by one.
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
