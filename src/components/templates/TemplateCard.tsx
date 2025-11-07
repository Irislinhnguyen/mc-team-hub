"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface TemplateCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
}

export const TemplateCard = ({ id, title, description, category }: TemplateCardProps) => {
  const router = useRouter();

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {category}
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => router.push(`/template/${id}`)}
          className="ml-4"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
