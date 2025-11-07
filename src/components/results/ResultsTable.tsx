import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

interface ResultsTableProps {
  data: Record<string, any>[];
  columns?: string[];
}

export const ResultsTable = ({ data, columns }: ResultsTableProps) => {
  // Auto-detect columns from data if not provided
  const tableColumns = columns || (data.length > 0 ? Object.keys(data[0]) : []);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Results</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Export to Sheets
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {tableColumns.map((column) => (
                  <TableHead key={column} className="font-semibold">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  {tableColumns.map((column) => (
                    <TableCell key={column} className="text-sm">
                      {row[column]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Showing {data.length} rows
      </div>
    </div>
  );
};
