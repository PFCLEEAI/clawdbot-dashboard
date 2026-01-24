"use client";

import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  weather?: {
    temperature: string;
    condition: string;
  };
}

export function Header({ weather }: HeaderProps) {
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateString = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦞</span>
          <h1 className="text-xl font-semibold">Clawdbot Dashboard</h1>
          <Badge variant="outline" className="ml-2">
            v0.1.0
          </Badge>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          {weather && (
            <div className="flex items-center gap-2">
              <span>{weather.condition}</span>
              <span className="font-medium text-foreground">
                {weather.temperature}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span>{dateString}</span>
            <span className="font-medium text-foreground">{timeString}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
