'use client'

import { FileDown, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { colors } from '../../../lib/colors'
import { exportElementToPDF, getExportFilename } from '../../../lib/utils/export'
import { useCrossFilter } from '../../contexts/CrossFilterContext'

interface PageHeaderProps {
  title: string
  contentRef?: React.RefObject<HTMLDivElement>
  showCrossFilterToggle?: boolean
}

export function PageHeader({ title, contentRef, showCrossFilterToggle = true }: PageHeaderProps) {
  const { autoEnable, setAutoEnable } = useCrossFilter()

  const handleExportReport = async () => {
    if (contentRef?.current) {
      await exportElementToPDF(contentRef.current, getExportFilename(title))
    }
  }

  const handleToggleCrossFilter = (checked: boolean) => {
    setAutoEnable(checked)
    // Persist to localStorage
    localStorage.setItem('analytics_cross_filter_enabled', JSON.stringify(checked))
  }

  return (
    <div
      className="bg-white border-b border-gray-200"
      style={{
        padding: '16px 24px'
      }}
    >
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold"
          style={{
            color: colors.main
          }}
        >
          {title}
        </h1>

        <div className="flex items-center gap-4">
          {/* Cross-filtering toggle - only show on data pages */}
          {showCrossFilterToggle && (
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium text-gray-600"
              >
                Cross-filtering
              </span>
              <div className="relative">
                <Switch
                  checked={autoEnable}
                  onCheckedChange={handleToggleCrossFilter}
                  aria-label="Toggle cross-filtering"
                  className="h-5 w-9 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300"
                />
                <style jsx global>{`
                  [role="switch"][aria-label="Toggle cross-filtering"] span {
                    height: 1rem !important;
                    width: 1rem !important;
                    transform: translateX(0) !important;
                  }
                  [role="switch"][aria-label="Toggle cross-filtering"][data-state="checked"] span {
                    transform: translateX(1rem) !important;
                  }
                `}</style>
              </div>
              <span
                className="text-xs font-semibold min-w-[30px]"
                style={{ color: autoEnable ? colors.main : colors.text.secondary }}
              >
                {autoEnable ? 'ON' : 'OFF'}
              </span>
              {/* Help icon with tooltip */}
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <button
                      className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Cross-filtering help"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs p-3">
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold">How to use Cross-filtering:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Click any cell in tables to filter by that value</li>
                        <li>Hold <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl</kbd> (or <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Cmd</kbd> on Mac) + Click to select multiple values</li>
                        <li>Cross-filters apply to the entire dashboard</li>
                        <li>Click the X on filter chips to remove individual filters</li>
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Page-level export button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportReport}
            className="flex items-center gap-2 hover:bg-gray-100 px-3 text-gray-700 transition-colors"
          >
            <FileDown className="h-4 w-4" />
            <span className="text-sm">Export PDF</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
