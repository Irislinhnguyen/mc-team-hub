interface InfoRowProps {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  children?: React.ReactNode
}

export function InfoRow({ label, value, icon, children }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-medium">
        {children || value || '—'}
      </div>
    </div>
  )
}
