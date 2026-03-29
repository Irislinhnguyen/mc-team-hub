/**
 * Certificate Template Generator
 * Generates professional completion certificates for MC Bible learning paths
 */

import { jsPDF } from 'jspdf'

export interface CertificateData {
  userName: string
  pathTitle: string
  pathDescription?: string | null
  completionDate: string
  pathIcon?: string | null
  pathColor?: string | null
}

/**
 * Generate a PDF certificate for a completed learning path
 */
export async function generateCertificate(data: CertificateData): Promise<Blob> {
  // Create PDF in landscape orientation
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Background
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')

  // Border color from path
  const color = data.pathColor ? hexToRgb(data.pathColor) : { r: 59, g: 130, b: 246 }

  // Decorative border
  pdf.setDrawColor(color.r, color.g, color.b)
  pdf.setLineWidth(3)
  pdf.rect(10, 10, pageWidth - 20, pageHeight - 20)

  // Inner border
  pdf.setLineWidth(1)
  pdf.rect(15, 15, pageWidth - 30, pageHeight - 30)

  // Header section
  pdf.setFontSize(28)
  pdf.setTextColor(color.r, color.g, color.b)
  pdf.text('Certificate of Completion', pageWidth / 2, 45, { align: 'center' })

  // Icon if provided
  if (data.pathIcon) {
    pdf.setFontSize(40)
    pdf.text(data.pathIcon, pageWidth / 2, 65, { align: 'center' })
  }

  // This is to certify
  pdf.setFontSize(12)
  pdf.setTextColor(100, 100, 100)
  pdf.text('This is to certify that', pageWidth / 2, 90, { align: 'center' })

  // User name
  pdf.setFontSize(32)
  pdf.setTextColor(0, 0, 0)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.userName, pageWidth / 2, 105, { align: 'center' })

  // Has successfully completed
  pdf.setFontSize(14)
  pdf.setTextColor(80, 80, 80)
  pdf.setFont('helvetica', 'normal')
  pdf.text('has successfully completed the learning path', pageWidth / 2, 120, { align: 'center' })

  // Path title
  pdf.setFontSize(36)
  pdf.setTextColor(color.r, color.g, color.b)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.pathTitle, pageWidth / 2, 135, { align: 'center' })

  // Path description if provided
  if (data.pathDescription) {
    pdf.setFontSize(11)
    pdf.setTextColor(120, 120, 120)
    pdf.setFont('helvetica', 'normal')
    const maxWidth = pageWidth - 60
    const lines = pdf.splitTextToSize(data.pathDescription, maxWidth)
    pdf.text(lines, pageWidth / 2, 150, { align: 'center' })
  }

  // Completion date
  pdf.setFontSize(12)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`Completed on ${data.completionDate}`, pageWidth / 2, pageHeight - 60, { align: 'center' })

  // Footer
  pdf.setFontSize(10)
  pdf.setTextColor(150, 150, 150)
  pdf.text('MC Bible - Course Edition', pageWidth / 2, pageHeight - 20, { align: 'center' })

  // Certificate ID (invisible but embedded)
  const certId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  pdf.setFontSize(6)
  pdf.setTextColor(200, 200, 200)
  pdf.text(`ID: ${certId}`, pageWidth - 15, pageHeight - 15, { align: 'right' })

  return pdf.output('blob')
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 59, g: 130, b: 246 }
}

/**
 * Format date for certificate
 */
export function formatDateForCertificate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
