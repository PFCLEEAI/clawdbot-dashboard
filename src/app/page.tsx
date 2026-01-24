import { Header } from "@/components/layout/Header";
import { StatusWidget } from "@/components/widgets/StatusWidget";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { EmailWidget } from "@/components/widgets/EmailWidget";
import { CronWidget } from "@/components/widgets/CronWidget";
import { SportsWidget } from "@/components/widgets/SportsWidget";

// Mock data - will be replaced with real API calls
const mockData = {
  weather: {
    temperature: "-12°C",
    condition: "☀️",
  },
  gateway: {
    status: "running" as const,
    channels: [
      { name: "whatsapp", status: "connected" as const },
      { name: "telegram", status: "disconnected" as const },
      { name: "discord", status: "disconnected" as const },
    ],
  },
  calendar: {
    events: [] as { id: string; title: string; time: string }[],
  },
  email: {
    unreadCount: 4,
    emails: [
      {
        id: "1",
        from: "GitHub",
        subject: "New pull request in clawdbot-dashboard",
        priority: "medium" as const,
      },
      {
        id: "2",
        from: "AWS",
        subject: "Your monthly bill is ready",
        priority: "low" as const,
      },
    ],
  },
  cron: {
    jobs: [
      {
        id: "1",
        name: "daily-briefing",
        schedule: "5:15 AM",
        nextRun: "Tomorrow",
        lastStatus: "ok" as const,
      },
      {
        id: "2",
        name: "brainstorm-reminder",
        schedule: "10:00 AM",
        nextRun: "In 3 hours",
        lastStatus: "pending" as const,
      },
    ],
  },
  sports: {
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
  },
};

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header weather={mockData.weather} />

      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Row 1: Status, Calendar, Email */}
          <StatusWidget
            gatewayStatus={mockData.gateway.status}
            channels={mockData.gateway.channels}
          />
          <CalendarWidget events={mockData.calendar.events} />
          <EmailWidget
            emails={mockData.email.emails}
            unreadCount={mockData.email.unreadCount}
          />

          {/* Row 2: Cron, Sports */}
          <CronWidget jobs={mockData.cron.jobs} />
          <SportsWidget teams={mockData.sports.teams} />

          {/* Placeholder for more widgets */}
          <div className="border-2 border-dashed border-muted rounded-lg p-6 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-2xl mb-2">🚧</p>
              <p className="text-sm">More widgets coming...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
