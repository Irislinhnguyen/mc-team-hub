interface NewPipelinesCardProps {
  count: number
}

export function NewPipelinesCard({ count }: NewPipelinesCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg px-5 py-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        New This Quarter
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {count}
      </div>
    </div>
  )
}
