"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  nextRun: string;
  lastStatus: "ok" | "error" | "pending";
}

interface CronWidgetProps {
  jobs: CronJob[];
}

const statusIcons = {
  ok: "✅",
  error: "❌",
  pending: "⏳",
};

export function CronWidget({ jobs }: CronWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          ⏰ Cron Jobs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No cron jobs configured
          </p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>{statusIcons[job.lastStatus]}</span>
                  <div>
                    <p className="text-sm font-medium">{job.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Next: {job.nextRun}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {job.schedule}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
