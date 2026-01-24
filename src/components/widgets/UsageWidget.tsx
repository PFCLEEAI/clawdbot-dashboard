"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UsageData {
  totalCost: number;
  todayCost: number;
  models: {
    name: string;
    cost: number;
    tokens: number;
  }[];
}

interface UsageWidgetProps {
  usage: UsageData | null;
}

function formatCost(cost: number): string {
  if (cost < 0.01) return "<$0.01";
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return String(tokens);
}

export function UsageWidget({ usage }: UsageWidgetProps) {
  if (!usage) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            📊 Usage Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No usage data available</p>
            <p className="text-xs mt-1">Configure CodexBar for tracking</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            📊 Usage Stats
          </CardTitle>
          <Badge variant="outline">{formatCost(usage.todayCost)} today</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total cost */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Total (this month)</span>
            <span className="text-2xl font-bold">{formatCost(usage.totalCost)}</span>
          </div>

          {/* Model breakdown */}
          {usage.models.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                By Model
              </span>
              {usage.models.slice(0, 4).map((model) => (
                <div
                  key={model.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate max-w-[60%]">{model.name}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{formatTokens(model.tokens)}</span>
                    <span className="text-foreground font-medium">
                      {formatCost(model.cost)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
