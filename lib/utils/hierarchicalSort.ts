/**
 * Hierarchically sorts data by parent-child relationships
 *
 * Use case: Sort projection tables by parent group totals, then children within groups
 * Example: PID table sorted by PIC total profit, then PIDs within each PIC
 *
 * @param data - Raw data from BigQuery
 * @param parentKey - Parent column name (e.g., 'pic', 'pid', 'mid')
 * @param childKey - Child column name (e.g., 'pid', 'mid', 'zid') - used for reference only
 * @param profitKey - Column to sort by (default: 'last_month_profit')
 * @returns Sorted array with parent groups ordered by total profit (desc), children within groups ordered by individual profit (desc)
 */
export function hierarchicalSort(
  data: any[],
  parentKey: string,
  childKey: string,
  profitKey: string = 'last_month_profit'
): any[] {
  if (!data || data.length === 0) {
    return []
  }

  // Step 1: Calculate parent totals
  const parentTotals = new Map<any, number>()

  data.forEach(row => {
    const parent = row[parentKey]
    const profit = parseProfit(row[profitKey])
    const current = parentTotals.get(parent) || 0
    parentTotals.set(parent, current + profit)
  })

  // Step 2: Sort parents by their total profit (descending)
  const sortedParents = Array.from(parentTotals.entries())
    .sort((a, b) => b[1] - a[1])  // Descending by total profit
    .map(entry => entry[0])

  // Step 3: Group children by parent
  const parentToChildren = new Map<any, any[]>()

  data.forEach(row => {
    const parent = row[parentKey]
    if (!parentToChildren.has(parent)) {
      parentToChildren.set(parent, [])
    }
    parentToChildren.get(parent)!.push(row)
  })

  // Step 4: Sort children within each parent group by individual profit (descending)
  parentToChildren.forEach((children, parent) => {
    children.sort((a, b) => {
      const profitA = parseProfit(a[profitKey])
      const profitB = parseProfit(b[profitKey])
      return profitB - profitA  // Descending
    })
  })

  // Step 5: Flatten into final sorted array
  const result: any[] = []

  sortedParents.forEach(parent => {
    const children = parentToChildren.get(parent) || []
    result.push(...children)
  })

  return result
}

/**
 * Helper to parse profit values from BigQuery (handles various formats)
 */
function parseProfit(value: any): number {
  if (value === null || value === undefined) return 0

  // BigQuery sometimes wraps values in objects like { value: "123" }
  const rawValue = value?.value !== undefined ? value.value : value

  // Convert to string and remove commas
  const stringValue = String(rawValue).replace(/,/g, '')

  const parsed = parseFloat(stringValue)
  return isNaN(parsed) ? 0 : parsed
}
