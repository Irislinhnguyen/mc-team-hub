'use client'

// TEST 1: Absolute minimum - just return text
// All original code has been backed up and removed for systematic debugging
export default function MarketOverviewPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">GCPP Check - Market Overview</h1>
      <p className="mt-4 text-green-600 font-semibold">✅ TEST 1: Bare minimum page - SUCCESS</p>
      <p className="mt-2">The page renders without crash. This confirms the issue is in the components/hooks.</p>
      <p className="mt-4 text-sm text-gray-600">
        Next: Will progressively add components to identify the exact crash source.
      </p>
    </div>
  )
}
