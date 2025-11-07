/**
 * Table utility functions for data transformation and display
 */

/**
 * Hides repeated consecutive values in specified columns
 * Only hides values that are identical to the previous row
 *
 * @param data - Array of table rows
 * @param columnsToHide - Column keys where repeated values should be hidden
 * @returns Processed data with hidden value markers
 */
export function hideRepeatedValues<T extends Record<string, any>>(
  data: T[],
  columnsToHide: string[]
): T[] {
  if (data.length === 0 || columnsToHide.length === 0) return data

  const result: T[] = []
  const previousValues: Record<string, any> = {}

  data.forEach((row, index) => {
    const newRow = { ...row }

    columnsToHide.forEach(columnKey => {
      const currentValue = row[columnKey]
      const prevValue = previousValues[columnKey]

      // Normalize values for comparison (handle BigQuery date objects)
      const currentStr = String(currentValue?.value ?? currentValue)
      const prevStr = String(prevValue?.value ?? prevValue)

      if (index > 0 && currentStr === prevStr) {
        // Mark as hidden but preserve original value
        (newRow as any)[columnKey] = {
          _hidden: true,
          _originalValue: currentValue,
          _displayValue: ''
        }
      } else {
        // Track this value for next iteration
        previousValues[columnKey] = currentValue
      }
    })

    result.push(newRow)
  })

  return result
}

/**
 * Hides repeated values within groups defined by grouping columns
 * Resets hiding when any group column value changes
 *
 * @param data - Array of table rows
 * @param groupColumns - Columns that define group boundaries
 * @param columnsToHide - Columns to hide repeated values within each group
 * @returns Processed data with hidden value markers
 *
 * @example
 * // Hide pubname/dates when they repeat within same PID
 * hideRepeatedValuesInGroups(
 *   data,
 *   ['pid'],  // Group by PID
 *   ['pubname', 'start_date', 'end_date']  // Hide these within each PID group
 * )
 */
export function hideRepeatedValuesInGroups<T extends Record<string, any>>(
  data: T[],
  groupColumns: string[],
  columnsToHide: string[]
): T[] {
  if (data.length === 0 || columnsToHide.length === 0) return data
  if (groupColumns.length === 0) return hideRepeatedValues(data, columnsToHide)

  const result: T[] = []
  const previousGroupValues: Record<string, any> = {}
  const previousValues: Record<string, any> = {}

  data.forEach((row, index) => {
    const newRow = { ...row }

    // Check if we're starting a new group
    const groupChanged = groupColumns.some(col => {
      const currentVal = String(row[col]?.value ?? row[col])
      const prevVal = String(previousGroupValues[col]?.value ?? previousGroupValues[col])
      return index > 0 && currentVal !== prevVal
    })

    // If group changed, reset the "previous values" tracker
    if (groupChanged) {
      Object.keys(previousValues).forEach(key => {
        delete previousValues[key]
      })
    }

    // Update group tracking values
    groupColumns.forEach(col => {
      previousGroupValues[col] = row[col]
    })

    // Hide repeated values within the current group
    columnsToHide.forEach(columnKey => {
      const currentValue = row[columnKey]
      const prevValue = previousValues[columnKey]

      const currentStr = String(currentValue?.value ?? currentValue)
      const prevStr = String(prevValue?.value ?? prevValue)

      if (index > 0 && !groupChanged && currentStr === prevStr) {
        newRow[columnKey] = {
          _hidden: true,
          _originalValue: currentValue,
          _displayValue: ''
        }
      } else {
        previousValues[columnKey] = currentValue
      }
    })

    result.push(newRow)
  })

  return result
}

/**
 * Check if a value is marked as hidden
 */
export function isHiddenValue(value: any): boolean {
  return value?._hidden === true
}

/**
 * Get the original value from a potentially hidden value
 */
export function getOriginalValue(value: any): any {
  return value?._hidden ? value._originalValue : value
}
