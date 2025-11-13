'use client'

import { Suspense, useRef, useState } from 'react'
import { AnalyticsPageLayout } from '../../../components/performance-tracker/AnalyticsPageLayout'
import { DateModeToggle } from '../../../components/gcpp-check/DateModeToggle'
// import { DateSelector } from '../../../components/gcpp-check/DateSelector'

// TEST 2.1: Just AnalyticsPageLayout + DateModeToggle (NO DateSelector)
function MarketOverviewPageContent() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single')

  const handleDateModeChange = (mode: 'single' | 'range') => {
    setDateMode(mode)
  }

  return (
    <AnalyticsPageLayout
      title="Market Overview"
      showExport={true}
      contentRef={contentRef}
    >
      <div className="flex items-center gap-4 mb-6">
        <DateModeToggle mode={dateMode} onModeChange={handleDateModeChange} />
        {/* DateSelector removed to test */}
      </div>

      <div className="p-8">
        <h1 className="text-2xl font-bold">GCPP Check - Market Overview</h1>
        <p className="mt-4 text-orange-600 font-semibold">⚠️ TEST 2.1: WITHOUT DateSelector</p>
        <p className="mt-2">Date Mode: {dateMode}</p>
        <p className="mt-2">If this works, DateSelector is the problem. If crashes, DateModeToggle is the problem.</p>
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
