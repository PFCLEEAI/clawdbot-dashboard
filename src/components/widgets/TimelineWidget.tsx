"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TimelineEvent {
  id: string;
  type: "cron" | "message" | "briefing" | "session" | "capture";
  title: string;
  description?: string;
  timestamp: string;
  status?: "success" | "error" | "pending";
}

interface TimelineWidgetProps {
  events: TimelineEvent[];
}

const typeIcons = {
  cron: "⏰",
  message: "💬",
  briefing: "📰",
  session: "🤖",
  capture: "✏️",
};

const typeColors = {
  cron: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  message: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  briefing: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  session: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  capture: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TimelineWidget({ events }: TimelineWidgetProps) {
  return (
    <Card className="col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          📜 Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-2xl mb-2">📜</p>
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
            
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={event.id} className="relative pl-8">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs ${typeColors[event.type]}`}
                  >
                    {typeIcons[event.type]}
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium truncate">
                        {event.title}
                      </span>
                      {event.status === "error" && (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {event.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(event.timestamp)}
                    </p>
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
