import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SummaryCardProps {
  summary: string;
  rowCount: number;
  queryTime: number;
  insights?: string[];
}

export const SummaryCard = ({ summary, rowCount, queryTime, insights }: SummaryCardProps) => {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Summary</h3>
        <p className="text-sm text-foreground leading-relaxed">{summary}</p>
      </div>

      {insights && insights.length > 0 && (
        <div className="mb-4">
          <ul className="space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start">
                <span className="mr-2">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Separator className="my-4" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Rows: {rowCount}</span>
        <span>Time: {queryTime}s</span>
      </div>
    </Card>
  );
};
