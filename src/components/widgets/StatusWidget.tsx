"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Channel {
  name: string;
  status: "connected" | "disconnected" | "error";
}

interface StatusWidgetProps {
  gatewayStatus: "running" | "stopped" | "unknown";
  channels: Channel[];
}

const statusColors = {
  connected: "bg-green-500",
  disconnected: "bg-gray-400",
  error: "bg-red-500",
  running: "bg-green-500",
  stopped: "bg-red-500",
  unknown: "bg-yellow-500",
};

export function StatusWidget({ gatewayStatus, channels }: StatusWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${statusColors[gatewayStatus]}`}
          />
          Gateway Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              variant={gatewayStatus === "running" ? "default" : "destructive"}
            >
              {gatewayStatus}
            </Badge>
          </div>

          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Channels
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {channels.map((channel) => (
                <div
                  key={channel.name}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${statusColors[channel.status]}`}
                  />
                  <span className="capitalize">{channel.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
