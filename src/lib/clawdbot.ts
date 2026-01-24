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

// Aggregate all dashboard data
export async function getDashboardData() {
  const [gateway, cron, weather, emails, calendar] = await Promise.all([
    getGatewayStatus(),
    getCronJobs(),
    getWeather(),
    getEmails(),
    getCalendarEvents(),
  ]);
  
  return {
    gateway,
    cron,
    weather,
    emails,
    calendar,
    fetchedAt: new Date().toISOString(),
  };
}
