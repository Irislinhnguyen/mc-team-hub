'use client'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import { HelpIcon } from './HelpIcon'

interface CsvPreviewStepProps {
  onNext: () => void
  onBack: () => void
}

export function CsvPreviewStep({ onNext, onBack }: CsvPreviewStepProps) {
  return (
    <Card className="border border-gray-100">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center">
            2
          </div>
          <div className="flex items-center">
            <CardTitle className="text-base">Upload CSV to Platform</CardTitle>
            <HelpIcon
              title="What to do"
              content={`1. Upload the CSV to your ad platform (e.g., Google Ad Manager)
2. Wait for zones to be created - the platform will assign Zone IDs
3. Take a screenshot of the table showing Zone IDs (PNG or JPG, max 10MB)

💡 Tip: Ensure Zone ID column is visible and use high resolution`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Navigation Buttons */}
        <div className="flex justify-end pt-4">
          <Button onClick={onNext} size="lg" className="w-full bg-[#1565C0] hover:bg-[#0D47A1] text-white">
            I Have Screenshot - Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
