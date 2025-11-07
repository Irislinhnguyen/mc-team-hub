'use client'

import { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AlertTriangle, TrendingUp, Activity, CheckCircle, Calculator } from 'lucide-react'
import { colors } from '../../../lib/colors'

interface MethodologyDialogProps {
  children: ReactNode // Trigger button
}

export function MethodologyDialog({ children }: MethodologyDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: colors.text.primary }}>
            <Calculator size={20} style={{ color: colors.data.primary }} />
            How Are Risk Levels Calculated?
          </DialogTitle>
          <DialogDescription>
            Understanding the methodology behind zone risk classification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Risk Score Formula */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text.primary }}>
              <Calculator size={16} />
              Risk Score Calculation
            </h4>
            <div className="p-4 rounded border text-sm space-y-3" style={{ backgroundColor: colors.surface.muted, borderColor: colors.border.default }}>
              <div className="font-mono text-base font-semibold" style={{ color: colors.data.primary }}>
                Risk Score = Severity Score × Impact Score
              </div>

              <div style={{ color: colors.text.secondary }}>
                <div className="font-semibold mb-1" style={{ color: colors.text.primary }}>Severity Score (based on % decline):</div>
                <ul className="space-y-0.5 ml-4">
                  <li>• 5 points: ≥75% decline</li>
                  <li>• 4 points: 50-75% decline</li>
                  <li>• 3 points: 25-50% decline</li>
                  <li>• 2 points: 10-25% decline</li>
                  <li>• 1 point: &lt;10% decline</li>
                </ul>
              </div>

              <div style={{ color: colors.text.secondary }}>
                <div className="font-semibold mb-1" style={{ color: colors.text.primary }}>Impact Score (based on revenue at risk):</div>
                <ul className="space-y-0.5 ml-4">
                  <li>• 5 points: ≥5% of total revenue</li>
                  <li>• 4 points: 2-5% of total</li>
                  <li>• 3 points: 0.5-2% of total</li>
                  <li>• 2 points: 0.1-0.5% of total</li>
                  <li>• 1 point: &lt;0.1% of total</li>
                </ul>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: colors.text.secondary }}>
              This combines both <strong>percentage decline</strong> (how severe) and <strong>absolute revenue impact</strong> (how much business is at risk) to prioritize zones that matter most.
            </p>
          </div>

          {/* Risk Classifications */}
          <div>
            <h4 className="font-semibold mb-3" style={{ color: colors.text.primary }}>
              Risk Level Classifications
            </h4>
            <div className="space-y-3">
              {/* Critical */}
              <div className="flex items-start gap-3 p-3 rounded border" style={{ backgroundColor: colors.status.dangerBg, borderColor: colors.status.danger }}>
                <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} style={{ color: colors.status.danger }} />
                <div className="flex-1">
                  <div className="font-semibold mb-1" style={{ color: colors.status.danger }}>
                    CRITICAL (Risk Score ≥ 20)
                  </div>
                  <div className="text-sm" style={{ color: colors.text.secondary }}>
                    Severe decline + major revenue impact. <strong>Example:</strong> 75% decline + $5,000 loss (3% of total) = Score: 5×4 = 20
                  </div>
                  <div className="text-sm font-semibold mt-2" style={{ color: colors.status.danger }}>
                    → Action: Investigate immediately. Check fill rate, blocking, integration errors.
                  </div>
                </div>
              </div>

              {/* High */}
              <div className="flex items-start gap-3 p-3 rounded border" style={{ backgroundColor: colors.status.warningBg, borderColor: colors.status.warning }}>
                <TrendingUp className="flex-shrink-0 mt-0.5 rotate-180" size={18} style={{ color: colors.status.warning }} />
                <div className="flex-1">
                  <div className="font-semibold mb-1" style={{ color: colors.status.warning }}>
                    HIGH RISK (Risk Score 12-19)
                  </div>
                  <div className="text-sm" style={{ color: colors.text.secondary }}>
                    Significant decline requiring attention. <strong>Example:</strong> 60% decline + moderate impact = Score: 4×3 = 12
                  </div>
                  <div className="text-sm font-semibold mt-2" style={{ color: colors.status.warning }}>
                    → Action: Review within 24 hours. Check demand partners and pricing.
                  </div>
                </div>
              </div>

              {/* Moderate */}
              <div className="flex items-start gap-3 p-3 rounded border" style={{ backgroundColor: colors.status.warningBg, borderColor: colors.status.warning }}>
                <Activity className="flex-shrink-0 mt-0.5" size={18} style={{ color: colors.status.warning }} />
                <div className="flex-1">
                  <div className="font-semibold mb-1" style={{ color: colors.status.warning }}>
                    MODERATE (Risk Score 6-11)
                  </div>
                  <div className="text-sm" style={{ color: colors.text.secondary }}>
                    Notable decrease worth monitoring. <strong>Example:</strong> 40% decline + minor impact = Score: 3×2 = 6
                  </div>
                  <div className="text-sm font-semibold mt-2" style={{ color: colors.status.warning }}>
                    → Action: Monitor trends. Investigate if decline continues beyond 3 days.
                  </div>
                </div>
              </div>

              {/* Healthy */}
              <div className="flex items-start gap-3 p-3 rounded border" style={{ backgroundColor: colors.surface.muted, borderColor: colors.border.default }}>
                <CheckCircle className="flex-shrink-0 mt-0.5" size={18} style={{ color: colors.status.success }} />
                <div className="flex-1">
                  <div className="font-semibold mb-1" style={{ color: colors.text.primary }}>
                    HEALTHY (Risk Score ≤ 5)
                  </div>
                  <div className="text-sm" style={{ color: colors.text.secondary }}>
                    Stable or minimal decline with low impact. No immediate action needed.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example Scenario */}
          <div>
            <h4 className="font-semibold mb-3" style={{ color: colors.text.primary }}>
              Why This Approach?
            </h4>
            <div className="space-y-2 text-sm" style={{ color: colors.text.secondary }}>
              <div className="p-3 rounded" style={{ backgroundColor: colors.surface.muted }}>
                <strong style={{ color: colors.text.primary }}>Scenario A:</strong> Zone loses 99% of revenue but only generated $10 total
                <br />
                → Score: 5 × 1 = <strong>5 (Healthy)</strong> — Low business impact despite high % drop
              </div>
              <div className="p-3 rounded" style={{ backgroundColor: colors.surface.muted }}>
                <strong style={{ color: colors.text.primary }}>Scenario B:</strong> Zone loses 40% of revenue but that's $4,000 (2% of total)
                <br />
                → Score: 3 × 4 = <strong>12 (High Risk)</strong> — Significant business impact, needs attention
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: colors.text.secondary }}>
              This weighted approach ensures you focus on zones that actually impact your business, not just high percentages on low-value zones.
            </p>
          </div>

          {/* Root Cause Detection */}
          <div>
            <h4 className="font-semibold mb-3" style={{ color: colors.text.primary }}>
              Root Cause Detection
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: colors.text.secondary }}>
              <li className="flex gap-2">
                <span className="font-semibold" style={{ color: colors.text.primary }}>Traffic Loss:</span>
                <span>Requests down ≥50%, but eCPM/Fill Rate stable</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold" style={{ color: colors.text.primary }}>Demand Loss:</span>
                <span>Fill Rate down ≥30%, eCPM down ≥30%, requests stable</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold" style={{ color: colors.text.primary }}>Pricing Collapse:</span>
                <span>eCPM down ≥50%, but requests and fill rate stable</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold" style={{ color: colors.text.primary }}>Multi-Factor Decline:</span>
                <span>All metrics declining together</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
