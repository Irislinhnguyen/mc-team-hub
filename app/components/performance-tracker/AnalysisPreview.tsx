'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Info, CheckCircle } from 'lucide-react'
import { colors } from '../../../lib/colors'

interface AnalysisPreviewProps {
  previewText: string
  hasAnalyzed: boolean
  resultsCount?: number
}

export function AnalysisPreview({
  previewText,
  hasAnalyzed,
  resultsCount
}: AnalysisPreviewProps) {

  if (!hasAnalyzed) {
    // Before analysis - show what will be analyzed
    return (
      <Card
        className="transition-all"
        style={{
          backgroundColor: colors.status.infoBg,
          border: `1px solid ${colors.data.primary}`
        }}
      >
        <CardContent className="py-3">
          <div className="flex items-start gap-3">
            <Info
              size={18}
              className="mt-0.5 flex-shrink-0"
              style={{ color: colors.data.primary }}
            />
            <div>
              <div className="text-sm font-medium" style={{ color: colors.text.primary }}>
                Ready to Analyze
              </div>
              <div className="text-sm mt-1" style={{ color: colors.text.secondary }}>
                {previewText}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // After analysis - show results summary
  return (
    <Card
      className="transition-all"
      style={{
        backgroundColor: colors.status.successBg,
        border: `1px solid ${colors.status.success}`
      }}
    >
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <CheckCircle
            size={18}
            className="mt-0.5 flex-shrink-0"
            style={{ color: colors.status.success }}
          />
          <div>
            <div className="text-sm font-medium" style={{ color: colors.status.success }}>
              Analysis Complete
            </div>
            <div className="text-sm mt-1" style={{ color: colors.text.secondary }}>
              {resultsCount !== undefined
                ? `Found ${resultsCount} zone${resultsCount !== 1 ? 's' : ''} matching your criteria`
                : 'Results loaded successfully'
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
