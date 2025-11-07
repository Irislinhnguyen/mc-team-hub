import { redirect } from 'next/navigation'

export default function PerformanceTrackerPage() {
  // Redirect to the main dashboard page
  redirect('/performance-tracker/business-health')
}
