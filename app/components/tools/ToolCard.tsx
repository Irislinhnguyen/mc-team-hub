'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { Tool } from '@/lib/types/tools'

interface ToolCardProps {
  tool: Tool
}

export function ToolCard({ tool }: ToolCardProps) {
  const categoryColors = {
    automation: 'bg-blue-100 text-blue-700',
    analysis: 'bg-purple-100 text-purple-700',
    reporting: 'bg-green-100 text-green-700',
  }

  return (
    <Link href={tool.route} className="block">
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
        <CardHeader>
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <Badge variant="secondary" className={categoryColors[tool.category]}>
              {tool.category}
            </Badge>
          </div>

          <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
            {tool.name}
          </CardTitle>
          <CardDescription className="mt-2 text-sm">{tool.description}</CardDescription>
        </CardHeader>

        <CardFooter>
          <Button variant="ghost" className="w-full group-hover:bg-blue-50 transition-colors">
            Open Tool
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  )
}
