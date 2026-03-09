/**
 * Clawdbot API client
 * Fetches data from local Clawdbot instance via CLI commands
 */

import { execSync } from "child_process";
import Database from "better-sqlite3";

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

export interface Topic {
  id: string;
  name: string;
  status: "active" | "paused" | "completed";
  tasks?: { total: number; done: number };
  lastUpdated?: string;
}

export interface TimelineEvent {
  id: string;
  type: "cron" | "message" | "briefing" | "session" | "capture";
  title: string;
  description?: string;
  timestamp: string;
  status?: "success" | "error" | "pending";
}

export async function getTopics(): Promise<Topic[]> {
  // Read from TODO.md on the external drive
  const todoPath = "/Volumes/Extreme Pro/pai-context/TODO.md";
  const result = exec(`cat "${todoPath}" 2>/dev/null`);
  
  if (!result) return [];
  
  const topics: Topic[] = [];
  
  // Parse sections from TODO.md
  const sections = [
    { pattern: /### Clawdbot Enhancement Ideas[\s\S]*?(?=###|$)/, name: "Clawdbot Enhancements" },
    { pattern: /### agent-readiness-score[\s\S]*?(?=###|$)/, name: "Agent Readiness Score" },
    { pattern: /### AI Transformation[\s\S]*?(?=###|$)/, name: "AI Transformation" },
  ];
  
  sections.forEach((section, index) => {
    const match = result.match(section.pattern);
    if (match) {
      const content = match[0];
      const doneCount = (content.match(/- \[x\]/gi) || []).length;
      const totalCount = (content.match(/- \[[ x]\]/gi) || []).length;
      
      if (totalCount > 0) {
        topics.push({
          id: String(index),
          name: section.name,
          status: doneCount === totalCount ? "completed" : "active",
          tasks: { total: totalCount, done: doneCount },
          lastUpdated: "today",
        });
      }
    }
  });
  
  return topics;
}

export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];
  
  // Get recent cron runs
  const cronResult = exec("clawdbot cron runs --limit 10 --json 2>/dev/null");
  if (cronResult) {
    try {
      const runs = JSON.parse(cronResult);
      (runs.runs || runs || []).slice(0, 5).forEach((run: any, idx: number) => {
        events.push({
          id: `cron-${idx}`,
          type: "cron",
          title: run.jobName || run.name || "Cron Job",
          description: run.status === "error" ? run.error : undefined,
          timestamp: run.startedAt || run.timestamp || new Date().toISOString(),
          status: run.status === "ok" ? "success" : run.status === "error" ? "error" : "pending",
        });
      });
    } catch {
      // Ignore
    }
  }
  
  // Add briefing event if exists
  const today = new Date().toISOString().split("T")[0];
  const briefingPath = `${process.env.HOME}/.clawdbot/tmp/newspaper-${today}.png`;
  const briefingExists = exec(`test -f "${briefingPath}" && echo "exists"`);
  if (briefingExists === "exists") {
    events.push({
      id: "briefing-today",
      type: "briefing",
      title: "Daily Briefing Generated",
      description: "The Daily Clawd newspaper created",
      timestamp: new Date().toISOString(),
      status: "success",
    });
  }
  
  // Sort by timestamp descending
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return events.slice(0, 10);
}

export interface SNSStats {
  today: {
    posts: number;
    comments: number;
    scraped: number;
  };
  pendingDrafts: number;
  weeklyTrend: { date: string; posts: number; comments: number; scraped: number }[];
  recentComments: { platform: string; targetUrl: string; commentText: string; postedAt: string }[];
}

export async function getSNSStats(): Promise<SNSStats> {
  const defaults: SNSStats = {
    today: { posts: 0, comments: 0, scraped: 0 },
    pendingDrafts: 0,
    weeklyTrend: [],
    recentComments: [],
  };

  let db: InstanceType<typeof Database> | null = null;
  try {
    const dbPath = `${process.env.HOME}/clawd/sns-automation/sns_content.db`;
    db = new Database(dbPath, { readonly: true });

    const today = new Date().toISOString().split("T")[0];

    // Today's stats
    const todayRow = db.prepare("SELECT * FROM daily_stats WHERE date = ?").get(today) as any;
    if (todayRow) {
      defaults.today = {
        posts: todayRow.posts || 0,
        comments: todayRow.comments || 0,
        scraped: todayRow.scraped || 0,
      };
    }

    // Pending drafts
    const draftRow = db.prepare("SELECT COUNT(*) as count FROM repurposed_content WHERE status = 'draft'").get() as any;
    defaults.pendingDrafts = draftRow?.count || 0;

    // Weekly trend
    const weekRows = db.prepare("SELECT * FROM daily_stats WHERE date >= date('now', '-7 days') ORDER BY date ASC").all() as any[];
    defaults.weeklyTrend = (weekRows || []).map((r: any) => ({
      date: r.date,
      posts: r.posts || 0,
      comments: r.comments || 0,
      scraped: r.scraped || 0,
    }));

    // Recent comments
    const commentRows = db.prepare("SELECT * FROM posted_comments ORDER BY posted_at DESC LIMIT 10").all() as any[];
    defaults.recentComments = (commentRows || []).map((r: any) => ({
      platform: r.platform || "",
      targetUrl: r.target_url || "",
      commentText: r.comment_text || "",
      postedAt: r.posted_at || "",
    }));

    return defaults;
  } catch {
    return defaults;
  } finally {
    if (db) {
      try { db.close(); } catch { /* ignore */ }
    }
  }
}

export async function triggerCronJob(name: string): Promise<{ success: boolean; output?: string; error?: string }> {
  const result = exec(`clawdbot cron run ${name} 2>&1`, 60000);
  if (result !== null) {
    return { success: true, output: result };
  }
  return { success: false, error: "Failed to trigger cron job" };
}

export interface CronRun {
  jobName: string;
  status: "ok" | "error";
  startedAt: string;
  duration?: number;
  error?: string;
}

export async function getCronRuns(limit: number = 20): Promise<CronRun[]> {
  const result = exec(`clawdbot cron runs --limit ${limit} --json 2>/dev/null`);
  if (result) {
    try {
      const data = JSON.parse(result);
      return (data.runs || data || []).map((r: any) => ({
        jobName: r.jobName || r.name || "unknown",
        status: r.status || "ok",
        startedAt: r.startedAt || r.timestamp || "",
        duration: r.durationMs || r.duration,
        error: r.error,
      }));
    } catch { /* fall through */ }
  }
  return [];
}

export async function chatWithClawdbot(message: string): Promise<{ response: string }> {
  // Sanitize message to prevent command injection
  const sanitized = message.replace(/[`$\\!"]/g, "");
  const result = exec(`clawdbot ask "${sanitized}" --json 2>/dev/null`, 60000);
  if (result) {
    try {
      const data = JSON.parse(result);
      return { response: data.response || data.text || data.answer || result };
    } catch {
      return { response: result };
    }
  }
  return { response: "No response from clawdbot" };
}

// Aggregate all dashboard data
export async function getDashboardData() {
  const [gateway, cron, weather, emails, calendar, briefing] = await Promise.all([
    getGatewayStatus(),
    getCronJobs(),
    getWeather(),
    getEmails(),
    getCalendarEvents(),
    getBriefingData(),
  ]);

  return {
    gateway,
    cron,
    weather,
    emails,
    calendar,
    briefing,
    fetchedAt: new Date().toISOString(),
  };
}
