/**
 * Clawdbot API client
 * Fetches data from local Clawdbot instance via CLI commands
 */

import { execSync } from "child_process";

export interface GatewayStatus {
  running: boolean;
  channels: {
    name: string;
    status: "connected" | "disconnected" | "error";
  }[];
}

export interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string;
  nextRunAtMs: number;
  lastStatus: "ok" | "error" | "pending";
}

export interface Weather {
  location: string;
  temperature: string;
  condition: string;
  humidity: string;
  wind: string;
}

export interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  priority: "high" | "medium" | "low";
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  isAllDay: boolean;
}

function exec(cmd: string, timeoutMs = 30000): string | null {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      timeout: timeoutMs,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

export async function getGatewayStatus(): Promise<GatewayStatus> {
  // Check if gateway is running by checking the daemon status
  const daemonResult = exec("clawdbot daemon status --json 2>/dev/null || echo '{}'");
  const healthResult = exec("clawdbot health --json 2>/dev/null || echo '{}'");
  
  let running = false;
  let whatsappConnected = false;
  
  if (daemonResult) {
    try {
      const data = JSON.parse(daemonResult);
      running = data.running ?? data.daemon?.running ?? false;
    } catch {
      // Check if process is running
      const psResult = exec("pgrep -f 'clawdbot.*gateway' || echo ''");
      running = !!psResult && psResult.length > 0;
    }
  }
  
  if (healthResult) {
    try {
      const data = JSON.parse(healthResult);
      whatsappConnected = data.whatsapp?.connected ?? false;
    } catch {
      // Ignore
    }
  }
  
  // If we can reach the cron API, gateway is running
  if (!running) {
    const cronResult = exec("clawdbot cron list --json 2>/dev/null");
    if (cronResult) {
      try {
        JSON.parse(cronResult);
        running = true;
      } catch {
        // Ignore
      }
    }
  }
  
  return {
    running,
    channels: [
      { name: "whatsapp", status: whatsappConnected ? "connected" : "disconnected" },
      { name: "telegram", status: "disconnected" },
      { name: "discord", status: "disconnected" },
    ],
  };
}

export async function getCronJobs(): Promise<CronJob[]> {
  const result = exec("clawdbot cron list --json");
  if (result) {
    try {
      const data = JSON.parse(result);
      return (data.jobs || []).map((job: any) => ({
        id: job.id,
        name: job.name,
        enabled: job.enabled,
        schedule: job.schedule?.expr || "",
        nextRunAtMs: job.state?.nextRunAtMs || 0,
        lastStatus: job.state?.lastStatus || "pending",
      }));
    } catch {
      // Fall through to default
    }
  }
  return [];
}

export async function getWeather(): Promise<Weather> {
  const result = exec(
    'curl -s "wttr.in/New+York?m&format=%l|%c|%t|%h|%w"',
    10000
  );
  if (result) {
    const parts = result.split("|");
    if (parts.length >= 5) {
      return {
        location: parts[0].trim(),
        condition: parts[1].trim(),
        temperature: parts[2].trim(),
        humidity: parts[3].trim(),
        wind: parts[4].trim(),
      };
    }
  }
  return {
    location: "New York",
    condition: "❓",
    temperature: "--",
    humidity: "--%",
    wind: "--",
  };
}

export async function getEmails(): Promise<Email[]> {
  const result = exec("himalaya envelope list -o json --folder INBOX --page-size 20");
  if (result) {
    try {
      const envelopes = JSON.parse(result);
      return envelopes
        .filter((e: any) => !e.flags?.includes("Seen"))
        .slice(0, 10)
        .map((e: any, index: number) => ({
          id: e.id || String(index),
          from: e.from?.[0]?.name || e.from?.[0]?.addr?.split("@")[0] || "Unknown",
          subject: e.subject || "(no subject)",
          date: e.date || "",
          priority: classifyEmailPriority(e),
        }));
    } catch {
      // Fall through to default
    }
  }
  return [];
}

function classifyEmailPriority(email: any): "high" | "medium" | "low" {
  const subject = (email.subject || "").toLowerCase();
  const from = (email.from?.[0]?.addr || "").toLowerCase();
  
  // High priority keywords
  if (
    subject.includes("urgent") ||
    subject.includes("important") ||
    subject.includes("action required")
  ) {
    return "high";
  }
  
  // Low priority patterns
  if (
    subject.includes("newsletter") ||
    subject.includes("unsubscribe") ||
    from.includes("noreply") ||
    from.includes("marketing")
  ) {
    return "low";
  }
  
  return "medium";
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const from = now.toISOString();
  const to = tomorrow.toISOString().split("T")[0] + "T23:59:59.999Z";
  
  const result = exec(
    `gog calendar events --account julien.pequegnot@googlemail.com --all --json --from "${from}" --to "${to}"`
  );
  
  if (result) {
    try {
      const events = JSON.parse(result);
      return events.slice(0, 10).map((e: any) => ({
        id: e.id || e.summary,
        title: e.summary || "Untitled",
        start: e.start?.dateTime || e.start?.date || "",
        end: e.end?.dateTime || e.end?.date || "",
        isAllDay: !e.start?.dateTime,
      }));
    } catch {
      // Fall through to default
    }
  }
  return [];
}

export interface UsageData {
  totalCost: number;
  todayCost: number;
  models: {
    name: string;
    cost: number;
    tokens: number;
  }[];
}

export interface Tweet {
  id: string;
  author: string;
  handle: string;
  text: string;
  time: string;
  likes?: number;
}

export async function getUsageStats(): Promise<UsageData | null> {
  // Try CodexBar for usage stats
  const result = exec("codexbar cost --json 2>/dev/null");
  if (result) {
    try {
      const data = JSON.parse(result);
      const models = Object.entries(data.models || {}).map(([name, info]: [string, any]) => ({
        name,
        cost: info.cost || 0,
        tokens: info.tokens || info.inputTokens + info.outputTokens || 0,
      }));
      
      return {
        totalCost: data.totalCost || data.total || 0,
        todayCost: data.todayCost || 0,
        models: models.sort((a, b) => b.cost - a.cost),
      };
    } catch {
      // Fall through
    }
  }
  return null;
}

export async function getTweets(): Promise<Tweet[]> {
  // Get tweets from followed accounts via bird CLI
  const result = exec('bird search "from:steipete OR from:thekitze OR from:anthropaboratory" -n 10 --json 2>/dev/null', 30000);
  if (result) {
    try {
      const tweets = JSON.parse(result);
      return tweets.slice(0, 10).map((t: any) => ({
        id: t.id,
        author: t.author?.name || "Unknown",
        handle: t.author?.username || "unknown",
        text: t.text || "",
        time: t.createdAt || new Date().toISOString(),
        likes: t.likeCount,
      }));
    } catch {
      // Fall through
    }
  }
  return [];
}

export async function getNewspaperPath(): Promise<string | null> {
  const today = new Date().toISOString().split("T")[0];
  const path = `${process.env.HOME}/.clawdbot/tmp/newspaper-${today}.png`;
  
  // Check if file exists
  const result = exec(`test -f "${path}" && echo "exists"`);
  if (result === "exists") {
    return `/api/newspaper?date=${today}`;
  }
  return null;
}

export async function getBriefingData() {
  const today = new Date().toISOString().split("T")[0];
  const weather = await getWeather();
  const emails = await getEmails();
  const calendar = await getCalendarEvents();
  
  return {
    date: today,
    weather: {
      temperature: weather.temperature,
      condition: weather.condition,
      humidity: weather.humidity,
      wind: weather.wind,
    },
    emailSummary: {
      total: emails.length,
      high: emails.filter(e => e.priority === "high").length,
      medium: emails.filter(e => e.priority === "medium").length,
      low: emails.filter(e => e.priority === "low").length,
    },
    calendarSummary: {
      eventCount: calendar.length,
      nextMeeting: calendar[0]?.title,
    },
    sports: [
      { team: "Arsenal", lastResult: "3-1 vs Inter", nextMatch: "Sun vs Man Utd" },
      { team: "PSG", lastResult: "1-0 vs Auxerre", nextMatch: "Wed vs Newcastle" },
    ],
  };
}

// Aggregate all dashboard data
export async function getDashboardData() {
  const [gateway, cron, weather, emails, calendar, usage, tweets, newspaperPath, briefing] = await Promise.all([
    getGatewayStatus(),
    getCronJobs(),
    getWeather(),
    getEmails(),
    getCalendarEvents(),
    getUsageStats(),
    getTweets(),
    getNewspaperPath(),
    getBriefingData(),
  ]);
  
  return {
    gateway,
    cron,
    weather,
    emails,
    calendar,
    usage,
    tweets,
    newspaperPath,
    briefing,
    fetchedAt: new Date().toISOString(),
  };
}
