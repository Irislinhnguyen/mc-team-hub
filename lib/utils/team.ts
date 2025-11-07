/**
 * Calculate team based on PIC and Product
 * Business Rules:
 * - If PIC starts with "id_" => WEB_GTI
 * - If Product starts with "app_" => APP
 * - Otherwise => WEB_GV
 */
export function calculateTeam(pic?: string, product?: string): string {
  // Check PIC first
  if (pic && pic.toLowerCase().startsWith('id_')) {
    return 'WEB_GTI'
  }

  // Check Product
  if (product && product.toLowerCase().startsWith('app_')) {
    return 'APP'
  }

  // Default
  return 'WEB_GV'
}

/**
 * Get unique teams from data based on business logic
 */
export function getUniqueTeams(data: Array<{ pic?: string; product?: string }>): Array<{ label: string; value: string }> {
  const teamsSet = new Set<string>()

  data.forEach(row => {
    const team = calculateTeam(row.pic, row.product)
    teamsSet.add(team)
  })

  return Array.from(teamsSet)
    .sort()
    .map(team => ({ label: team, value: team }))
}
