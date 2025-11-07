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
import { HelpCircle, TrendingUp } from 'lucide-react'
import { colors } from '../../../lib/colors'

export function TierClassificationHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-gray-100"
          style={{ color: colors.interactive.primary }}
        >
          <HelpCircle size={16} />
          How Tiers Work
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: colors.text.primary }}>
            <TrendingUp size={20} style={{ color: colors.data.primary }} />
            Tier Classification Explained
          </DialogTitle>
          <DialogDescription>
            Understanding the 80-15-5 rule and how Tier A, B, and C are assigned
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* The Pareto Principle */}
          <div>
            <h4 className="font-semibold mb-3" style={{ color: colors.text.primary }}>
              The 80-15-5 Rule (Pareto Principle)
            </h4>
            <p className="text-sm mb-3" style={{ color: colors.text.secondary }}>
              In most businesses, a small percentage of items generate the majority of revenue. This tier system helps you focus on what matters most.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-24 font-semibold" style={{ color: colors.status.success }}>Tier A</div>
                <div style={{ color: colors.text.secondary }}>Top 80% of total revenue</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 font-semibold" style={{ color: colors.status.warning }}>Tier B</div>
                <div style={{ color: colors.text.secondary }}>Next 15% of total revenue (80-95% cumulative)</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 font-semibold" style={{ color: colors.status.danger }}>Tier C</div>
                <div style={{ color: colors.text.secondary }}>Bottom 5% of total revenue (95-100% cumulative)</div>
              </div>
            </div>
          </div>

          {/* How Classification Works */}
          <div>
            <h4 className="font-semibold mb-3" style={{ color: colors.text.primary }}>
              How Items Are Classified
            </h4>
            <div className="space-y-3 text-sm" style={{ color: colors.text.secondary }}>
              <div>
                <strong style={{ color: colors.text.primary }}>Step 1: Calculate Total Revenue</strong>
                <p>Sum up revenue from all items in the selected period</p>
              </div>
              <div>
                <strong style={{ color: colors.text.primary }}>Step 2: Sort by Revenue</strong>
                <p>Items are sorted from highest to lowest revenue</p>
              </div>
              <div>
                <strong style={{ color: colors.text.primary }}>Step 3: Calculate Cumulative Percentage</strong>
                <p>As we go down the list, we track what % of total revenue we've accumulated</p>
              </div>
              <div>
                <strong style={{ color: colors.text.primary }}>Step 4: Assign Tiers</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• Items that together make up the first 80% of revenue → <span style={{ color: colors.status.success }}>Tier A</span></li>
                  <li>• Items that make up 80-95% of cumulative revenue → <span style={{ color: colors.status.warning }}>Tier B</span></li>
                  <li>• Remaining items (95-100% cumulative) → <span style={{ color: colors.status.danger }}>Tier C</span></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Visual Example */}
          <div>
            <h4 className="font-semibold mb-3" style={{ color: colors.text.primary }}>
              Example: Revenue Distribution
            </h4>
            <div className="text-sm mb-3" style={{ color: colors.text.secondary }}>
              Suppose you have 100 publishers with $100,000 total revenue:
            </div>
            <div className="space-y-2">
              <div className="p-3 rounded" style={{ backgroundColor: colors.status.successBg }}>
                <div className="font-semibold mb-1" style={{ color: colors.status.success }}>Tier A: Top 20 Publishers</div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>
                  Generate $80,000 (80% of total) - Average: $4,000 per publisher
                </div>
              </div>

              <div className="p-3 rounded" style={{ backgroundColor: colors.status.warningBg }}>
                <div className="font-semibold mb-1" style={{ color: colors.status.warning }}>Tier B: Next 30 Publishers</div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>
                  Generate $15,000 (15% of total, 80-95% cumulative) - Average: $500 per publisher
                </div>
              </div>

              <div className="p-3 rounded" style={{ backgroundColor: colors.status.dangerBg }}>
                <div className="font-semibold mb-1" style={{ color: colors.status.danger }}>Tier C: Remaining 50 Publishers</div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>
                  Generate $5,000 (5% of total, 95-100% cumulative) - Average: $100 per publisher
                </div>
              </div>
            </div>
          </div>

          {/* NEW and LOST Items */}
          <div>
            <h4 className="font-semibold mb-3" style={{ color: colors.text.primary }}>
              NEW and LOST Item Classification
            </h4>
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-semibold mb-1" style={{ color: colors.status.info }}>NEW Items</div>
                <div style={{ color: colors.text.secondary }}>
                  Items that appeared in Period 2 but not in Period 1. They get tier assignments based on their performance:
                </div>
                <div className="mt-1 ml-4 space-y-1" style={{ color: colors.text.secondary }}>
                  <div><strong>NEW-A:</strong> Strong start - Would be in top 80%</div>
                  <div><strong>NEW-B:</strong> Moderate start - Would be in 80-95% range</div>
                  <div><strong>NEW-C:</strong> Weak start - Would be in bottom 5%</div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-1" style={{ color: colors.status.danger }}>LOST Items</div>
                <div style={{ color: colors.text.secondary }}>
                  Items that existed in Period 1 but disappeared in Period 2. They show their Period 1 tier:
                </div>
                <div className="mt-1 ml-4 space-y-1" style={{ color: colors.text.secondary }}>
                  <div><strong>LOST-A:</strong> Lost a high-value item (was top 80%)</div>
                  <div><strong>LOST-B:</strong> Lost a moderate item (was 80-95%)</div>
                  <div><strong>LOST-C:</strong> Lost a low-value item (was bottom 5%)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Why This Matters */}
          <div>
            <h4 className="font-semibold mb-3" style={{ color: colors.text.primary }}>
              Why This Classification Matters
            </h4>
            <div className="space-y-2 text-sm" style={{ color: colors.text.secondary }}>
              <div>
                <strong style={{ color: colors.status.success }}>Focus on Tier A:</strong> These items drive your business. Any problems here have major impact and need immediate attention.
              </div>
              <div>
                <strong style={{ color: colors.status.warning }}>Monitor Tier B:</strong> These items have growth potential. Watch for opportunities to move them to Tier A.
              </div>
              <div>
                <strong style={{ color: colors.status.danger }}>Evaluate Tier C:</strong> Consider whether these items are worth maintaining or if resources should be reallocated.
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="pt-4 border-t" style={{ borderColor: colors.border.default }}>
            <p className="text-sm italic" style={{ color: colors.text.secondary }}>
              Note: Tier assignments are dynamic and recalculated for each analysis period. An item can move between tiers as performance changes.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
