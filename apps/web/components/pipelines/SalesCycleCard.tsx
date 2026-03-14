interface SalesCycleCardProps {
  avgDays: number | null
}

export function SalesCycleCard({ avgDays }: SalesCycleCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg px-5 py-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        Avg Sales Cycle
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {avgDays !== null ? `${avgDays}d` : '-'}
      </div>
    </div>
  )
}
