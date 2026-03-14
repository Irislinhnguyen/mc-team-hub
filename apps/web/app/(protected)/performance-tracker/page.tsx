import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function PerformanceTrackerPage() {
  // Redirect to the main dashboard page
  redirect('/performance-tracker/business-health')
}
