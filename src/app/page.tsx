"use client";

import { Header } from "@/components/layout/Header";
import { StatusWidget } from "@/components/widgets/StatusWidget";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { EmailWidget } from "@/components/widgets/EmailWidget";
import { CronWidget } from "@/components/widgets/CronWidget";
import { SportsWidget } from "@/components/widgets/SportsWidget";
import { useDashboard } from "@/hooks/useDashboard";
import { Button } from "@/components/ui/button";

// Sports data is static for now (would need a separate API)
const sportsData = {
  teams: [
    {
      name: "Arsenal",
      emoji: "🔴",
      lastResult: "3-1 vs Inter",
      nextMatch: {
        opponent: "Manchester United",
        date: "Sun 11:30 AM",
        competition: "Premier League",
      },
    },
    {
      name: "PSG",
      emoji: "🔵",
      lastResult: "1-0 vs Auxerre",
      nextMatch: {
        opponent: "Newcastle",
        date: "Wed 3:00 PM",
        competition: "Champions League",
      },
    },
  ],
};

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatNextRun(nextRunAtMs: number): string {
  if (!nextRunAtMs) return "Not scheduled";
  
  const now = Date.now();
  const diff = nextRunAtMs - now;
  
  if (diff < 0) return "Overdue";
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `In ${mins} min${mins !== 1 ? "s" : ""}`;
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `In ${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  
  const date = new Date(nextRunAtMs);
  return date.toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

export default function Dashboard() {
  const { data, loading, error, lastRefresh, refresh } = useDashboard({
    refreshInterval: 60000, // Refresh every minute
  });

  // Loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl animate-bounce inline-block">🦞</span>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state (with retry)
  if (error && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">😵</span>
          <p className="mt-4 text-destructive">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={refresh} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Transform data for widgets
  const gatewayStatus = data?.gateway.running ? "running" : "stopped";
  const channels = data?.gateway.channels || [];
  
  const calendarEvents = (data?.calendar || []).map((e) => ({
    id: e.id,
    title: e.title,
    time: e.isAllDay ? "All day" : formatTime(e.start),
    isAllDay: e.isAllDay,
  }));
  
  const emails = (data?.emails || []).map((e) => ({
    id: e.id,
    from: e.from,
    subject: e.subject,
    priority: e.priority,
  }));
  
  const cronJobs = (data?.cron || [])
    .filter((j) => j.enabled)
    .map((j) => ({
      id: j.id,
      name: j.name,
      schedule: j.schedule,
      nextRun: formatNextRun(j.nextRunAtMs),
      lastStatus: j.lastStatus,
    }));

  const weather = data?.weather
    ? {
        temperature: data.weather.temperature,
        condition: data.weather.condition,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Header weather={weather} />

      <main className="container mx-auto p-6">
        {/* Refresh indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground">
            {lastRefresh && (
              <span>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            {error && (
              <span className="ml-2 text-destructive">(refresh failed)</span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            ↻ Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Row 1: Status, Calendar, Email */}
          <StatusWidget
            gatewayStatus={gatewayStatus as "running" | "stopped" | "unknown"}
            channels={channels}
          />
          <CalendarWidget events={calendarEvents} />
          <EmailWidget
            emails={emails}
            unreadCount={emails.length}
          />

          {/* Row 2: Cron, Sports */}
          <CronWidget jobs={cronJobs} />
          <SportsWidget teams={sportsData.teams} />

          {/* Placeholder for more widgets */}
          <div className="border-2 border-dashed border-muted rounded-lg p-6 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-2xl mb-2">🚧</p>
              <p className="text-sm">More widgets coming...</p>
              <p className="text-xs mt-1">Usage stats, Twitter, etc.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
