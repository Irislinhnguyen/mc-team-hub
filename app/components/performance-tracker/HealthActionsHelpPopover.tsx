'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { HelpCircle } from 'lucide-react'
import { colors } from '../../../lib/colors'

export function HealthActionsHelpPopover() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center justify-center w-4 h-4 ml-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Health & Actions help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: colors.text.primary }}>
            <HelpCircle size={20} style={{ color: colors.data.primary }} />
            Health & Actions Column Explanation
          </DialogTitle>
          <DialogDescription>
            Understanding how health warnings are calculated and displayed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div>
            <p className="text-sm" style={{ color: colors.text.secondary }}>
              This column displays automated health warnings based on performance changes between Period 2 (P2) and Period 1 (P1).
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3" style={{ color: colors.text.primary }}>
              Severity Levels
            </h4>
            <div className="space-y-2">
              <div className="p-3 rounded" style={{ backgroundColor: colors.status.dangerBg }}>
                <div className="font-semibold mb-1" style={{ color: colors.status.danger }}>
                  CRITICAL (Red)
                </div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>
                  Severe performance issues requiring immediate attention
                </div>
              </div>
              <div className="p-3 rounded" style={{ backgroundColor: colors.status.warningBg }}>
                <div className="font-semibold mb-1" style={{ color: colors.status.warning }}>
                  WARNING (Orange)
                </div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>
                  Moderate performance decline, monitor closely
                </div>
              </div>
              <div className="p-3 rounded" style={{ backgroundColor: colors.status.infoBg }}>
                <div className="font-semibold mb-1" style={{ color: colors.status.info }}>
                  INFO (Blue)
                </div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>
                  Minor performance changes worth noting
                </div>
              </div>
              <div className="p-3 rounded" style={{ backgroundColor: colors.surface.muted }}>
                <div className="font-semibold mb-1" style={{ color: colors.text.primary }}>
                  HEALTHY (Blank)
                </div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>
                  All metrics stable, no issues detected
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3" style={{ color: colors.text.primary }}>
              Calculation Thresholds
            </h4>
            <div className="space-y-4">
              <div>
                <div className="font-semibold mb-2" style={{ color: colors.status.danger }}>CRITICAL Triggers:</div>
                <ul className="space-y-1 text-sm ml-4" style={{ color: colors.text.secondary }}>
                  <li>• Request volume dropped ≥40%</li>
                  <li>• eCPM dropped ≥40%</li>
                  <li>• Both requests AND eCPM dropped ≥25% (combined crisis)</li>
                  <li>• Fill rate critically low (&lt;50%) with ≥15% drop</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold mb-2" style={{ color: colors.status.warning }}>WARNING Triggers:</div>
                <ul className="space-y-1 text-sm ml-4" style={{ color: colors.text.secondary }}>
                  <li>• Request volume dropped 25-40%</li>
                  <li>• eCPM dropped 25-40%</li>
                  <li>• Revenue down 25-40% due to traffic drop</li>
                  <li>• Revenue down 25-40% due to eCPM decline</li>
                  <li>• Fill rate dropped 15-30%</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold mb-2" style={{ color: colors.status.info }}>INFO Triggers:</div>
                <ul className="space-y-1 text-sm ml-4" style={{ color: colors.text.secondary }}>
                  <li>• Request volume dropped 15-25%</li>
                  <li>• eCPM dropped 15-25%</li>
                  <li>• Fill rate dropped 10-15%</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold mb-2" style={{ color: colors.text.primary }}>HEALTHY Status:</div>
                <p className="text-sm ml-4" style={{ color: colors.text.secondary }}>All metrics stable or declining less than thresholds above</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t" style={{ borderColor: colors.border.default }}>
            <p className="text-sm italic" style={{ color: colors.text.secondary }}>
              Note: NEW and LOST tier items always show as healthy (no warnings displayed)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
