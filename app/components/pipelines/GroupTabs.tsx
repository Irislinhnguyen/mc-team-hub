'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface GroupTabsProps {
  activeGroup: 'sales' | 'cs'
  onGroupChange: (group: 'sales' | 'cs') => void
  salesCount: number
  csCount: number
}

export function GroupTabs({
  activeGroup,
  onGroupChange,
  salesCount,
  csCount,
}: GroupTabsProps) {
  return (
    <Tabs value={activeGroup} onValueChange={(value) => onGroupChange(value as 'sales' | 'cs')}>
      <TabsList className="bg-gray-100">
        <TabsTrigger
          value="sales"
          className="gap-2 data-[state=active]:bg-[#1565C0] data-[state=active]:text-white"
        >
          Sales
          <Badge variant="secondary" className="ml-1 data-[state=active]:bg-white data-[state=active]:text-[#1565C0]">
            {salesCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="cs"
          className="gap-2 data-[state=active]:bg-[#1565C0] data-[state=active]:text-white"
        >
          CS
          <Badge variant="secondary" className="ml-1 data-[state=active]:bg-white data-[state=active]:text-[#1565C0]">
            {csCount}
          </Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
