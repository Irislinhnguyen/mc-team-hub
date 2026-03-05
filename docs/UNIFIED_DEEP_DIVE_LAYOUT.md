# Unified Deep Dive Layout - Design Mockup

## Overview
Single unified page that adapts based on selected perspective. All perspectives share the same layout structure but show different data/metrics.

---

## Example 1: PIC Perspective (filter: pic = "minhlv")

```
╔════════════════════════════════════════════════════════════════════════════╗
║  DEEP DIVE ANALYTICS                                    [Period Selector]  ║
╚════════════════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────────────────┐
│ PERSPECTIVE TABS                                                           │
│ ┌──────┬──────┬──────────┬──────┬─────────┬──────┐                        │
│ │ Team │ [PIC]│ Publisher│ Media│ Product │ Zone │                        │
│ └──────┴──────┴──────────┴──────┴─────────┴──────┘                        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ FILTERS                                                                    │
│ PIC: minhlv  [x]                                                          │
│ Period 1: Oct 1-15, 2025  |  Period 2: Oct 16-31, 2025                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SUMMARY METRICS (PIC: minhlv)                                             │
├──────────────────┬──────────────────┬──────────────────┬─────────────────┤
│  Total Revenue   │   Publishers     │   Growth Rate    │  Fill Rate      │
│                  │                  │                  │                 │
│  $45,231         │       12         │   +15.3%        │    28.5%        │
│  ↑ +$6,012       │   +2 new         │   ↗ improving   │    ↑ +2.1%      │
│  vs Period 1     │   -1 lost        │                  │                 │
└──────────────────┴──────────────────┴──────────────────┴─────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TIER FILTER BADGES                                                         │
│ ┌──────────┬──────────┬────────────────┬────────────┬─────┬──────┐       │
│ │ Hero (5) │ Solid(3) │Underperf. (2)  │ Remove (1) │New(2)│Lost(1)│     │
│ └──────────┴──────────┴────────────────┴────────────┴─────┴──────┘       │
│                                                                            │
│ [All Tiers Selected]                                                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PUBLISHERS (PIC: minhlv)                              [Export] [AI Insights]│
├─────┬─────────────────────┬──────────┬──────────┬───────────┬─────────────┤
│Tier │ Publisher           │ Revenue  │ Change   │ Fill Rate │ Status      │
├─────┼─────────────────────┼──────────┼──────────┼───────────┼─────────────┤
│ 🌟  │ Publisher 36059     │ $15,234  │ +52.3%  │ 32.1%     │ [Drill ↓]   │
│HERO │ (12 media)          │          │ ⭐ Rising Star │         │             │
├─────┼─────────────────────┼──────────┼──────────┼───────────┼─────────────┤
│ 🌟  │ Publisher 37653     │ $12,450  │ +65.8%  │ 29.4%     │ [Drill ↓]   │
│HERO │ (8 media)           │          │          │           │             │
├─────┼─────────────────────┼──────────┼──────────┼───────────┼─────────────┤
│ ⭐  │ Publisher 35929     │ $8,120   │ +28.1%  │ 25.6%     │ [Drill ↓]   │
│HERO │ (15 media)          │          │          │           │             │
├─────┼─────────────────────┼──────────┼──────────┼───────────┼─────────────┤
│ 💰  │ Publisher 38354     │ $4,230   │ +22.4%  │ 31.2%     │ [Drill ↓]   │
│SOLID│ (5 media)           │          │          │           │             │
├─────┼─────────────────────┼──────────┼──────────┼───────────┼─────────────┤
│ 💰  │ Publisher 14610     │ $2,890   │ +21.0%  │ 27.8%     │ [Drill ↓]   │
│SOLID│ (6 media)           │          │          │           │             │
├─────┼─────────────────────┼──────────┼──────────┼───────────┼─────────────┤
│ ⚠️  │ Publisher 37550     │ $1,450   │ +8.2%   │ 22.1%     │ [Drill ↓]   │
│UNDER│ (3 media)           │          │ ⚠️ At Risk    │         │             │
├─────┼─────────────────────┼──────────┼──────────┼───────────┼─────────────┤
│ ⚠️  │ Publisher 33325     │   $980   │ -5.3%   │ 18.4%     │ [Drill ↓]   │
│UNDER│ (4 media)           │          │          │           │             │
├─────┼─────────────────────┼──────────┼──────────┼───────────┼─────────────┤
│ 🗑️  │ Publisher 8002      │   $120   │ -42.1%  │ 12.3%     │ [Remove?]   │
│REMOVE│ (1 media)          │          │          │           │             │
├─────┼─────────────────────┼──────────┼──────────┼───────────┼─────────────┤
│ 🆕  │ Publisher 38800     │   $856   │ N/A     │ 24.5%     │ [Drill ↓]   │
│NEW-A│ (2 media)           │          │ (New - Tier A)│      │             │
├─────┼─────────────────────┼──────────┼──────────┼───────────┼─────────────┤
│ 🆕  │ Publisher 38801     │   $234   │ N/A     │ 19.2%     │ [Drill ↓]   │
│NEW-C│ (1 media)           │          │ (New - Tier C)│      │             │
├─────┼─────────────────────┼──────────┼──────────┼───────────┼─────────────┤
│ ❌  │ Publisher 37888     │   $0     │ Lost    │ 0%        │             │
│LOST │ (was Tier A)        │ Lost $2,341 (5.2% impact) │    │             │
└─────┴─────────────────────┴──────────┴──────────┴───────────┴─────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ 💡 AI INSIGHTS (PIC: minhlv)                                              │
│                                                                            │
│ • Strong performance: 5 Hero publishers contributing 78% of revenue       │
│ • Publisher 36059 showing exceptional growth (+52%) - potential for       │
│   expansion to new products                                               │
│ • WARNING: Publisher 37550 growth slowing - at risk of tier downgrade     │
│ • Lost Publisher 37888 (Tier A) had significant revenue - investigate     │
│   cause of loss                                                           │
│ • 2 new publishers added - New-A (38800) shows strong start              │
└────────────────────────────────────────────────────────────────────────────┘
```

**Click [Drill ↓] on Publisher 36059:**
→ Navigate to **Publisher Perspective** filtered to `pid=36059`
→ Shows all media properties for that publisher

---

## Example 2: Team Perspective (filter: team = "Web")

```
╔════════════════════════════════════════════════════════════════════════════╗
║  DEEP DIVE ANALYTICS                                    [Period Selector]  ║
╚════════════════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────────────────┐
│ PERSPECTIVE TABS                                                           │
│ ┌────────┬──────┬──────────┬──────┬─────────┬──────┐                      │
│ │ [TEAM] │ PIC  │ Publisher│ Media│ Product │ Zone │                      │
│ └────────┴──────┴──────────┴──────┴─────────┴──────┘                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ FILTERS                                                                    │
│ Team: Web  [x]                                                            │
│ Period 1: Oct 1-15, 2025  |  Period 2: Oct 16-31, 2025                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SUMMARY METRICS (Team: Web)                                               │
├──────────────────┬──────────────────┬──────────────────┬─────────────────┤
│  Total Revenue   │   Team Members   │   Publishers     │  Avg Fill Rate  │
│                  │   (PICs)         │                  │                 │
│  $186,450        │       8          │      45          │    26.8%        │
│  ↑ +$22,341      │   +1 new         │   +6 new         │    ↑ +1.8%      │
│  (+13.6%)        │   -0 lost        │   -3 lost        │                 │
└──────────────────┴──────────────────┴──────────────────┴─────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TIER FILTER BADGES                                                         │
│ ┌──────────┬──────────┬────────────────┬────────────┬─────┬──────┐       │
│ │ Hero (3) │ Solid(2) │Underperf. (2)  │ Remove (0) │New(1)│Lost(0)│     │
│ └──────────┴──────────┴────────────────┴────────────┴─────┴──────┘       │
│                                                                            │
│ [All Tiers Selected]                                                      │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TEAM MEMBERS (Team: Web)                              [Export] [AI Insights]│
├─────┬─────────────────────┬──────────┬──────────┬────────────┬────────────┤
│Tier │ PIC Name            │ Revenue  │ Change   │ Publishers │ Status     │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ 🌟  │ minhlv              │ $65,234  │ +18.5%  │ 12 pubs    │ [Drill ↓]  │
│HERO │                     │          │          │ (2 new)    │            │
│     │ Portfolio: 5 Hero, 3 Solid, 2 Underperf, 2 New           │          │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ 🌟  │ tungnt              │ $54,120  │ +22.3%  │ 8 pubs     │ [Drill ↓]  │
│HERO │                     │          │ ⭐ Rising Star │       │            │
│     │ Portfolio: 4 Hero, 2 Solid, 2 Underperf              │            │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ ⭐  │ hieund              │ $32,890  │ +55.8%  │ 6 pubs     │ [Drill ↓]  │
│HERO │                     │          │          │            │            │
│     │ Portfolio: 3 Hero, 1 Solid, 2 Underperf              │            │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ 💰  │ anhdt               │ $18,340  │ +21.2%  │ 7 pubs     │ [Drill ↓]  │
│SOLID│                     │          │          │ (1 new)    │            │
│     │ Portfolio: 2 Hero, 3 Solid, 2 Underperf              │            │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ 💰  │ thanhhn             │ $12,560  │ +20.1%  │ 5 pubs     │ [Drill ↓]  │
│SOLID│                     │          │          │            │            │
│     │ Portfolio: 1 Hero, 3 Solid, 1 Underperf              │            │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ ⚠️  │ linhpt              │  $2,340  │ +12.4%  │ 4 pubs     │ [Drill ↓]  │
│UNDER│                     │          │ ⚠️ At Risk    │       │            │
│     │ Portfolio: 0 Hero, 1 Solid, 3 Underperf              │            │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ ⚠️  │ ducnm               │    $966  │ +8.2%   │ 3 pubs     │ [Drill ↓]  │
│UNDER│                     │          │          │            │            │
│     │ Portfolio: 0 Hero, 0 Solid, 3 Underperf              │            │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ 🆕  │ huongltt            │    $0    │ N/A     │ 0 pubs     │ [Drill ↓]  │
│NEW  │                     │          │ (New team member)    │            │
│     │ Portfolio: Just joined - no publishers yet           │            │
└─────┴─────────────────────┴──────────┴──────────┴────────────┴────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ 💡 AI INSIGHTS (Team: Web)                                                │
│                                                                            │
│ • Team health: STRONG - 3 Hero PICs contributing 82% of team revenue     │
│ • Top performer: minhlv with 12 publishers, stable portfolio             │
│ • Rising star: tungnt showing exceptional growth (+22.3%)                │
│ • WARNING: linhpt at risk - no Hero publishers in portfolio              │
│ • New member: huongltt joined - needs publisher assignments              │
│ • Team added 6 new publishers this period, lost 3 (net +3)              │
└────────────────────────────────────────────────────────────────────────────┘
```

**Click [Drill ↓] on minhlv:**
→ Navigate to **PIC Perspective** filtered to `pic=minhlv`
→ Shows Example 1 above

---

## Example 3: Publisher Perspective (Drilled down from PIC)

```
╔════════════════════════════════════════════════════════════════════════════╗
║  DEEP DIVE ANALYTICS                                    [Period Selector]  ║
╚════════════════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────────────────┐
│ BREADCRUMB NAVIGATION                                                      │
│ Team: Web → PIC: minhlv → Publisher: 36059                               │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PERSPECTIVE TABS                                                           │
│ ┌──────┬──────┬─────────────┬──────┬─────────┬──────┐                    │
│ │ Team │ PIC  │ [PUBLISHER] │ Media│ Product │ Zone │                    │
│ └──────┴──────┴─────────────┴──────┴─────────┴──────┘                    │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ FILTERS                                                                    │
│ Publisher: 36059 (Publisher Name ABC)  [x]                                │
│ Period 1: Oct 1-15, 2025  |  Period 2: Oct 16-31, 2025                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SUMMARY METRICS (Publisher: 36059)                                        │
├──────────────────┬──────────────────┬──────────────────┬─────────────────┤
│  Total Revenue   │   Media Props    │   Growth Rate    │  Fill Rate      │
│                  │                  │                  │                 │
│  $15,234         │      12          │   +52.3%        │    32.1%        │
│  ↑ +$5,228       │   +2 new         │   ⭐ Rising Star │    ↑ +3.2%      │
│  vs Period 1     │   -0 lost        │                  │                 │
└──────────────────┴──────────────────┴──────────────────┴─────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TIER FILTER BADGES                                                         │
│ ┌──────────┬──────────┬────────────────┬────────────┬─────┬──────┐       │
│ │ Hero (6) │ Solid(3) │Underperf. (1)  │ Remove (0) │New(2)│Lost(0)│     │
│ └──────────┴──────────┴────────────────┴────────────┴─────┴──────┘       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ MEDIA PROPERTIES (Publisher: 36059)                   [Export] [AI Insights]│
├─────┬──────────────────────┬──────────┬──────────┬───────────┬────────────┤
│Tier │ Media Property       │ Revenue  │ Change   │ Product   │ Zones      │
├─────┼──────────────────────┼──────────┼──────────┼───────────┼────────────┤
│ 🌟  │ Media 12345          │  $5,230  │ +85.2%  │ Native    │ 8 zones    │
│HERO │ example.com          │          │          │           │ [Drill ↓]  │
├─────┼──────────────────────┼──────────┼──────────┼───────────┼────────────┤
│ 🌟  │ Media 12346          │  $3,120  │ +62.1%  │ Display   │ 5 zones    │
│HERO │ demo.com             │          │          │           │ [Drill ↓]  │
├─────┼──────────────────────┼──────────┼──────────┼───────────┼────────────┤
│ 🌟  │ Media 12347          │  $2,450  │ +55.8%  │ Video     │ 3 zones    │
│HERO │ test.com             │          │          │           │ [Drill ↓]  │
├─────┼──────────────────────┼──────────┼──────────┼───────────┼────────────┤
│ 💰  │ Media 12348          │  $1,890  │ +28.3%  │ Native    │ 4 zones    │
│SOLID│ sample.com           │          │          │           │ [Drill ↓]  │
├─────┼──────────────────────┼──────────┼──────────┼───────────┼────────────┤
│ 🆕  │ Media 12355          │    $824  │ N/A     │ Display   │ 2 zones    │
│NEW-A│ newsite.com          │          │(New - Tier A)│      │ [Drill ↓]  │
├─────┼──────────────────────┼──────────┼──────────┼───────────┼────────────┤
│ 🆕  │ Media 12356          │    $156  │ N/A     │ Native    │ 1 zone     │
│NEW-C│ another.com          │          │(New - Tier C)│      │ [Drill ↓]  │
└─────┴──────────────────────┴──────────┴──────────┴───────────┴────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ 💡 AI INSIGHTS (Publisher: 36059)                                         │
│                                                                            │
│ • Exceptional growth: +52.3% driven by 6 Hero media properties           │
│ • Top performer: Media 12345 (example.com) with +85% growth              │
│ • Product mix: Native (50%), Display (33%), Video (17%)                  │
│ • 2 new media added - Media 12355 showing strong start (Tier A)          │
│ • Recommendation: Expand Native ads on top performers                    │
└────────────────────────────────────────────────────────────────────────────┘
```

**Click [Drill ↓] on Media 12345:**
→ Navigate to **Media Perspective** filtered to `mid=12345`
→ Shows all zones for that media property

---

## Example 4: Product Perspective (No filter - All products)

```
╔════════════════════════════════════════════════════════════════════════════╗
║  DEEP DIVE ANALYTICS                                    [Period Selector]  ║
╚════════════════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────────────────┐
│ PERSPECTIVE TABS                                                           │
│ ┌──────┬──────┬──────────┬──────┬───────────┬──────┐                     │
│ │ Team │ PIC  │ Publisher│ Media│ [PRODUCT] │ Zone │                     │
│ └──────┴──────┴──────────┴──────┴───────────┴──────┘                     │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ FILTERS                                                                    │
│ [No filters - All products]                                               │
│ Period 1: Oct 1-15, 2025  |  Period 2: Oct 16-31, 2025                   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ SUMMARY METRICS (All Products)                                            │
├──────────────────┬──────────────────┬──────────────────┬─────────────────┤
│  Total Revenue   │   Products       │   Publishers     │  Avg Fill Rate  │
│                  │                  │   Using          │                 │
│  $324,589        │      32          │     268          │    27.2%        │
│  ↑ +$24,832      │   -1 lost        │                  │    ↑ +1.5%      │
│  (+8.28%)        │                  │                  │                 │
└──────────────────┴──────────────────┴──────────────────┴─────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ TIER FILTER BADGES                                                         │
│ ┌──────────┬──────────┬────────────────┬────────────┬─────┬──────┐       │
│ │ Hero (5) │ Solid(1) │Underperf. (16) │ Remove (9) │New(0)│Lost(1)│     │
│ └──────────┴──────────┴────────────────┴────────────┴─────┴──────┘       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ PRODUCTS                                              [Export] [AI Insights]│
├─────┬─────────────────────┬──────────┬──────────┬────────────┬────────────┤
│Tier │ Product             │ Revenue  │ Change   │ Publishers │ Zones      │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ 🌟  │ native              │ $125,340 │ +15.2%  │ 156 pubs   │ 823 zones  │
│HERO │                     │          │          │            │ [Drill ↓]  │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ 🌟  │ app_interstitial    │  $78,450 │ +22.8%  │ 98 pubs    │ 412 zones  │
│HERO │                     │          │ ⭐ Rising Star │       │ [Drill ↓]  │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ ⭐  │ display             │  $52,120 │ +8.5%   │ 142 pubs   │ 654 zones  │
│HERO │                     │          │          │            │ [Drill ↓]  │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ 💰  │ video               │  $32,450 │ +21.3%  │ 45 pubs    │ 178 zones  │
│SOLID│                     │          │          │            │ [Drill ↓]  │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ ⚠️  │ app_rewarded        │  $12,340 │ +5.2%   │ 23 pubs    │ 89 zones   │
│UNDER│                     │          │ ⚠️ At Risk    │       │ [Drill ↓]  │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ ⚠️  │ sticky              │   $8,450 │ -12.5%  │ 67 pubs    │ 234 zones  │
│UNDER│                     │          │          │            │ [Drill ↓]  │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ 🗑️  │ anchor              │   $1,234 │ -38.2%  │ 12 pubs    │ 45 zones   │
│REMOVE│                    │          │          │            │ [Consider] │
├─────┼─────────────────────┼──────────┼──────────┼────────────┼────────────┤
│ ❌  │ inread              │      $0  │ Lost    │ 0 pubs     │ 0 zones    │
│LOST │ (was Tier B)        │ Lost $3,450 (1.1% impact)│      │            │
└─────┴─────────────────────┴──────────┴──────────┴────────────┴────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ 💡 AI INSIGHTS (Products)                                                 │
│                                                                            │
│ • Top 3 products (Native, App Interstitial, Display) = 78% of revenue    │
│ • Growth leader: app_interstitial (+22.8%) - strong mobile adoption      │
│ • WARNING: sticky product declining -12.5% - investigate causes          │
│ • anchor product is removal candidate (low revenue, high decline)        │
│ • Lost product: inread discontinued this period                          │
│ • Recommendation: Focus on app_interstitial expansion                    │
└────────────────────────────────────────────────────────────────────────────┘
```

**Click [Drill ↓] on native:**
→ Navigate to **Zone Perspective** filtered to `product=native`
→ Shows all zones using native product

---

## Key UI Features in All Perspectives:

### 1. **Tier Badges with Icons**
- 🌟 Hero = High growth star performers
- 💰 Solid = Stable cash cows
- ⚠️ Underperformer = Warning sign
- 🗑️ Remove = Trash candidate
- 🆕 New = New item with tier (NEW-A, NEW-B, NEW-C)
- ❌ Lost = Lost with previous tier info

### 2. **Transition Warnings**
- ⭐ Rising Star = Item growing fast, may upgrade tier
- ⚠️ At Risk = Item slowing down, may downgrade tier
- 📈 Approaching Tier X = Near threshold for tier change

### 3. **Lost Items Enhanced**
```
│ ❌  │ Publisher 37888     │   $0     │ Lost    │           │            │
│LOST │ (was Tier A)        │ Lost $2,341 (5.2% impact)    │            │
```
Shows: Previous tier + Lost revenue amount + % impact

### 4. **New Items Enhanced**
```
│ 🆕  │ Publisher 38800     │   $856   │ N/A     │           │            │
│NEW-A│ (2 media)           │          │ (New - Tier A)     │            │
```
Shows: Current tier based on P2 revenue (A/B/C)

### 5. **Drill-Down Hierarchy**
```
Team → PIC → Publisher → Media → Zone
       ↓
    Product → Zone
```

Breadcrumb navigation shows path taken

---

Bạn thấy layout này như thế nào? Có cần adjust gì không?
