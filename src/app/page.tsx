"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatusWidget } from "@/components/widgets/StatusWidget";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { EmailWidget } from "@/components/widgets/EmailWidget";
import { CronWidget } from "@/components/widgets/CronWidget";
import { SportsWidget } from "@/components/widgets/SportsWidget";
import { UsageWidget } from "@/components/widgets/UsageWidget";
import { TwitterWidget } from "@/components/widgets/TwitterWidget";
import { BriefingWidget } from "@/components/widgets/BriefingWidget";
import { NewspaperWidget } from "@/components/widgets/NewspaperWidget";
import { TopicsWidget } from "@/components/widgets/TopicsWidget";
import { QuickCaptureWidget } from "@/components/widgets/QuickCaptureWidget";
import { TimelineWidget } from "@/components/widgets/TimelineWidget";
import { TabManagerWidget } from "@/components/widgets/TabManagerWidget";
import { KanbanWidget } from "@/components/widgets/KanbanWidget";
import { SaasIdeasWidget } from "@/components/widgets/SaasIdeasWidget";
import { SNSEngagementWidget } from "@/components/widgets/SNSEngagementWidget";
import { ClawdbotControlWidget } from "@/components/widgets/ClawdbotControlWidget";
import { CommandPalette } from "@/components/CommandPalette";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { Button } from "@/components/ui/button";

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

// Sports data is static for now
const sportsData = {
  teams: [
    {
      name: "Arsenal",
      emoji: "🔴",
      lastResult: "3-1 vs Inter",
      nextMatch: { opponent: "Manchester United", date: "Sun 11:30 AM", competition: "Premier League" },
    },
    {
      name: "PSG",
      emoji: "🔵",
      lastResult: "1-0 vs Auxerre",
      nextMatch: { opponent: "Newcastle", date: "Wed 3:00 PM", competition: "Champions League" },
    },
  ],
};

export default function Dashboard() {
  const { data, loading, error, lastRefresh, refresh } = useDashboard({ refreshInterval: 60000 });
  const { mode, visibleWidgets, isLoaded, setMode, setVisibleWidgets, getGreeting } = useDashboardSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const commands = [
    { id: "refresh", name: "Refresh Dashboard", description: "Reload all data", icon: "↻", shortcut: "⌘R", category: "Actions", action: refresh },
    { id: "settings", name: "Open Settings", description: "Configure dashboard", icon: "⚙️", category: "Actions", action: () => setSettingsOpen(true) },
    { id: "mode-work", name: "Switch to Work Mode", description: "Focus on productivity", icon: "💼", category: "Mode", action: () => setMode("work") },
    { id: "mode-personal", name: "Switch to Personal Mode", description: "Relax and unwind", icon: "🏠", category: "Mode", action: () => setMode("personal") },
    { id: "capture-note", name: "Quick Note", description: "Capture a quick note", icon: "📝", category: "Capture", action: () => { const note = prompt("Enter your note:"); if (note) fetch("/api/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: note, type: "note" }) }); } },
    { id: "capture-task", name: "Quick Task", description: "Add a task", icon: "☑️", category: "Capture", action: () => { const task = prompt("Enter your task:"); if (task) fetch("/api/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: task, type: "task" }) }); } },
    { id: "open-github", name: "Open GitHub Repo", icon: "🐙", category: "Links", action: () => { window.open("https://github.com/jpequegn/clawdbot-dashboard", "_blank"); } },
    { id: "saas-ideas", name: "Open SaaS Ideas", description: "Browse and validate SaaS opportunities", icon: "💡", category: "Links", action: () => { window.location.href = "/saas-ideas"; } },
    { id: "kanban", name: "Open Project Board", description: "Kanban-style project management", icon: "📋", category: "Links", action: () => { window.location.href = "/kanban"; } },
  ];

  if ((loading && !data) || !isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl animate-bounce inline-block">🦞</span>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">😵</span>
          <p className="mt-4 text-destructive">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={refresh} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  const gatewayStatus = data?.gateway.running ? "running" : "stopped";
  const channels = data?.gateway.channels || [];
  const calendarEvents = (data?.calendar || []).map((e) => ({
    id: e.id, title: e.title, time: e.isAllDay ? "All day" : formatTime(e.start), isAllDay: e.isAllDay,
  }));
  const emails = (data?.emails || []).map((e) => ({
    id: e.id, from: e.from, subject: e.subject, priority: e.priority,
  }));
  const cronJobs = (data?.cron || []).filter((j) => j.enabled).map((j) => ({
    id: j.id, name: j.name, schedule: j.schedule, nextRun: formatNextRun(j.nextRunAtMs), lastStatus: j.lastStatus,
  }));
  const weather = data?.weather ? { temperature: data.weather.temperature, condition: data.weather.condition } : undefined;
  const today = new Date().toISOString().split("T")[0];
  const isVisible = (id: string) => visibleWidgets.includes(id);

  return (
    <div className="min-h-screen bg-background">
      <Header weather={weather} mode={mode} greeting={getGreeting()} onSettingsClick={() => setSettingsOpen(true)} />

      <main className="container mx-auto p-6">
        {/* Refresh bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground">
            {lastRefresh && <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>}
            {error && <span className="ml-2 text-destructive">(refresh failed)</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Press ⌘K for commands</span>
            <Button variant="outline" size="sm" onClick={refresh}>↻ Refresh</Button>
          </div>
        </div>

        {/* === NEW FOCUSED LAYOUT === */}
        <div className="space-y-6">
          {/* Row 1: Cron Jobs (full width, prominent) */}
          {isVisible("cron") && <CronWidget jobs={cronJobs} />}

          {/* Row 2: SNS Engagement + SaaS Ideas (2 columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isVisible("sns-engagement") && <SNSEngagementWidget />}
            {isVisible("saas-ideas") && <SaasIdeasWidget />}
          </div>

          {/* Row 3: Clawdbot Control (full width) */}
          {isVisible("clawdbot-control") && <ClawdbotControlWidget />}

          {/* Row 4: Email + Calendar (2 columns, compact) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isVisible("email") && <EmailWidget emails={emails} unreadCount={emails.length} />}
            {isVisible("calendar") && <CalendarWidget events={calendarEvents} />}
          </div>

          {/* Row 5: Status + Quick Capture (2 columns, compact) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isVisible("status") && <StatusWidget gatewayStatus={gatewayStatus as "running" | "stopped" | "unknown"} channels={channels} />}
            {isVisible("capture") && <QuickCaptureWidget />}
          </div>

          {/* Hidden by default but available via settings */}
          {isVisible("sports") && <SportsWidget teams={sportsData.teams} />}
          {isVisible("usage") && <UsageWidget usage={data?.usage || null} />}
          {isVisible("topics") && <TopicsWidget topics={data?.topics || []} />}
          {isVisible("timeline") && <TimelineWidget events={data?.timeline || []} />}
          {isVisible("briefing") && <BriefingWidget briefing={data?.briefing || null} />}
          {isVisible("newspaper") && <NewspaperWidget imagePath={data?.newspaperPath || null} date={today} />}
          {isVisible("twitter") && <TwitterWidget tweets={data?.tweets || []} />}
          {isVisible("tabs") && <TabManagerWidget maxTabs={5} warnAt={4} />}
          {isVisible("kanban") && <KanbanWidget />}
        </div>
      </main>

      <CommandPalette commands={commands} />
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        onModeChange={setMode}
        visibleWidgets={visibleWidgets}
        onWidgetsChange={setVisibleWidgets}
      />
    </div>
  );
}
