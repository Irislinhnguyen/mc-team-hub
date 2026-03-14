'use client'

import { MoreVertical, Image, FileText, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExportButtonProps {
  title: string
  dataInfo?: string
  onExportPNG?: () => void
  onExportCSV?: () => void
  onExportPDF?: () => void
  isLoading?: boolean
}

export function ExportButton({
  title,
  dataInfo,
  onExportPNG,
  onExportCSV,
  onExportPDF,
  isLoading = false
}: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isLoading}
          className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
        >
          <MoreVertical className="h-4 w-4 text-gray-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32 border-0 shadow-lg">
        {onExportPNG && (
          <DropdownMenuItem onClick={onExportPNG}>
            <Image className="h-4 w-4 mr-2" />
            PNG
          </DropdownMenuItem>
        )}
        {onExportCSV && (
          <DropdownMenuItem onClick={onExportCSV}>
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </DropdownMenuItem>
        )}
        {onExportPDF && (
          <DropdownMenuItem onClick={onExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
