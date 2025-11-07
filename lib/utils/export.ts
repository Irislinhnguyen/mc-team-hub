import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'

/**
 * Export HTML element to PNG
 */
export async function exportElementToPNG(element: HTMLElement | null, filename: string): Promise<void> {
  if (!element) {
    console.error('Element not found for export')
    return
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
    })

    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `${filename}.png`)
      }
    })
  } catch (error) {
    console.error('Error exporting to PNG:', error)
  }
}

/**
 * Export data array to CSV
 */
export function exportToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    console.error('No data to export')
    return
  }

  try {
    // Get headers from first object
    const headers = Object.keys(data[0])

    // Create CSV content
    const csvContent = [
      // Header row
      headers.join(','),
      // Data rows
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]
          // Handle values that might contain commas
          const stringValue = String(value ?? '')
          return stringValue.includes(',') ? `"${stringValue}"` : stringValue
        }).join(',')
      )
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `${filename}.csv`)
  } catch (error) {
    console.error('Error exporting to CSV:', error)
  }
}

/**
 * Export HTML element to PDF
 */
export async function exportElementToPDF(element: HTMLElement | null, filename: string): Promise<void> {
  if (!element) {
    console.error('Element not found for export')
    return
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    })

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
    pdf.save(`${filename}.pdf`)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
  }
}

/**
 * Format filename with timestamp
 */
export function getExportFilename(baseFilename: string): string {
  const date = new Date()
  const timestamp = date.toISOString().split('T')[0] // YYYY-MM-DD
  return `${baseFilename}-${timestamp}`
}
