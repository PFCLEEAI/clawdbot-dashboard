"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  nextRun: string;
  lastStatus: "ok" | "error" | "pending";
}

interface CronRun {
  jobName: string;
  status: "ok" | "error";
  startedAt: string;
  duration?: number;
}

interface CronWidgetProps {
  jobs: CronJob[];
}

function humanSchedule(cron: string): string {
  // Convert common cron expressions to human-readable
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;
  const [min, hour, , , ] = parts;

  if (hour.includes(",")) {
    const hours = hour.split(",").map((h) => {
      const n = parseInt(h);
      return n >= 12 ? `${n === 12 ? 12 : n - 12}PM` : `${n === 0 ? 12 : n}AM`;
    });
    return `Daily at ${hours.join(", ")}`;
  }

  const h = parseInt(hour);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const m = parseInt(min);
  return `Daily at ${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function CronWidget({ jobs }: CronWidgetProps) {
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [showRuns, setShowRuns] = useState(false);

  useEffect(() => {
    fetch("/api/cron/logs")
      .then((r) => r.json())
      .then((data) => setRuns(data.runs || []))
      .catch(console.error);
  }, []);

  const triggerJob = useCallback(async (jobName: string) => {
    setTriggering(jobName);
    try {
      await fetch("/api/cron/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobName }),
      });
      // Refresh runs after trigger
      const res = await fetch("/api/cron/logs");
      const data = await res.json();
      setRuns(data.runs || []);
    } catch (err) {
      console.error("Failed to trigger:", err);
    } finally {
      setTriggering(null);
    }
  }, []);

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            ⏰ Cron Jobs
            <Badge variant="outline" className="text-[10px]">{jobs.length} active</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setShowRuns(!showRuns)}
          >
            {showRuns ? "Hide Runs" : "Recent Runs"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Job Cards Grid */}
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No cron jobs configured</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobs.map((job) => {
              const statusColor = job.lastStatus === "ok"
                ? "bg-green-500"
                : job.lastStatus === "error"
                ? "bg-red-500"
                : "bg-amber-500";

              return (
                <div
                  key={job.id}
                  className="flex flex-col p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusColor} ${job.lastStatus === "ok" ? "animate-pulse" : ""}`} />
                      <span className="text-sm font-semibold">{job.name}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {humanSchedule(job.schedule)}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    Next: {job.nextRun}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 mt-auto"
                    disabled={triggering === job.name}
                    onClick={() => triggerJob(job.name)}
                  >
                    {triggering === job.name ? "⏳ Running..." : "▶ Run Now"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Collapsible Recent Runs */}
        {showRuns && runs.length > 0 && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground mb-2">Recent Executions</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {runs.slice(0, 15).map((run, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span>{run.status === "ok" ? "✅" : "❌"}</span>
                    <span className="font-medium">{run.jobName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {run.duration && <span>{(run.duration / 1000).toFixed(1)}s</span>}
                    <span>{run.startedAt ? new Date(run.startedAt).toLocaleString() : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
