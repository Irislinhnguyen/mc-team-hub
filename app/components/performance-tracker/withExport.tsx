'use client'

import { useRef, ComponentType } from 'react'
import { ExportButton } from './ExportButton'
import { exportElementToPNG, exportElementToPDF, exportToCSV, getExportFilename } from '../../../lib/utils/export'

interface WithExportProps {
  title: string
  data: any[]
}

/**
 * Higher-Order Component that adds export functionality to any chart/table component
 * Automatically adds hamburger menu with PNG, CSV, and PDF export options
 */
export function withExport<P extends WithExportProps>(
  Component: ComponentType<P>
) {
  return function WithExportComponent(props: P) {
    const containerRef = useRef<HTMLDivElement>(null)

    const handleExportPNG = async () => {
      if (containerRef.current) {
        await exportElementToPNG(containerRef.current, getExportFilename(props.title))
      }
    }

    const handleExportPDF = async () => {
      if (containerRef.current) {
        await exportElementToPDF(containerRef.current, getExportFilename(props.title))
      }
    }

    const handleExportCSV = () => {
      if (props.data && props.data.length > 0) {
        exportToCSV(props.data, getExportFilename(props.title))
      }
    }

    // Generate data info string
    const dataInfo = props.data && props.data.length > 0
      ? `${props.data.length} ${props.data.length === 1 ? 'row' : 'rows'}`
      : undefined

    return (
      <div ref={containerRef} className="relative">
        {/* Export hamburger menu positioned at top-right */}
        <div className="absolute top-3 right-3 z-10">
          <ExportButton
            title={props.title}
            dataInfo={dataInfo}
            onExportPNG={handleExportPNG}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
          />
        </div>
        {/* Original component */}
        <Component {...props} />
      </div>
    )
  }
}
