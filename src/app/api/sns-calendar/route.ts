import { NextRequest, NextResponse } from "next/server";
import { list, put } from "@vercel/blob";
import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BLOB_PREFIX = "sns-calendar";
const IS_VERCEL = process.env.VERCEL === "1";
const HOME = process.env.HOME || "";
const CLAWD = path.join(HOME, "clawd");
const SNS_DB_PATH = path.join(CLAWD, "sns-automation/sns_content.db");
const MASTER_DB_PATH = path.join(CLAWD, "clawdbot_db/clawdbot_master.db");
const ENGAGEMENT_DB_PATH = path.join(CLAWD, "reddit_db/reddit_engagement.db");
const PENETRATION_LOG = path.join(CLAWD, "reddit_marketing/penetration_log.jsonl");
const ENGAGEMENT_PATTERNS_DIR = path.join(CLAWD, "sns_data/engagement_patterns");

export interface SNSActivity {
  id: string;
  date: string;
  time: string;
  platform: "reddit" | "x" | "unknown";
  type: "post" | "comment" | "reply" | "upvote" | "scrape" | "penetration";
  profile: string;
  targetUrl: string;
  content: string;
  status: "posted" | "failed" | "pending" | "draft" | "scheduled";
  subreddit?: string;
}

export interface CalendarDay {
  date: string;
  totalActivities: number;
  posts: number;
  comments: number;
  platforms: string[];
}

// ============ LOCAL SQLite ============

async function getLocalDB(dbPath: string) {
  try {
    if (!existsSync(dbPath)) return null;
    const Database = (await import("better-sqlite3")).default;
    return new Database(dbPath, { readonly: true });
  } catch {
    return null;
  }
}

async function getLocalActivitiesForDate(date: string): Promise<SNSActivity[]> {
  const activities: SNSActivity[] = [];

  // 1. SNS Content DB - posted_comments
  const snsDb = await getLocalDB(SNS_DB_PATH);
  if (snsDb) {
    try {
      const comments = snsDb.prepare(
        `SELECT id, platform, target_url, comment_text, posted_at
         FROM posted_comments
         WHERE date(posted_at) = ?
         ORDER BY posted_at DESC`
      ).all(date) as any[];

      for (const c of comments) {
        activities.push({
          id: `sns-comment-${c.id}`,
          date,
          time: c.posted_at ? new Date(c.posted_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
          platform: c.platform || "unknown",
          type: "comment",
          profile: "",
          targetUrl: c.target_url || "",
          content: c.comment_text || "",
          status: "posted",
        });
      }

      // repurposed_content (posts)
      const posts = snsDb.prepare(
        `SELECT rc.id, rc.platform, rc.repurposed_text, rc.status, rc.posted_at, rc.post_url
         FROM repurposed_content rc
         WHERE date(COALESCE(rc.posted_at, rc.scheduled_at, rc.created_at)) = ?
         ORDER BY COALESCE(rc.posted_at, rc.scheduled_at, rc.created_at) DESC`
      ).all(date) as any[];

      for (const p of posts) {
        const ts = p.posted_at || p.created_at;
        activities.push({
          id: `sns-post-${p.id}`,
          date,
          time: ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
          platform: p.platform || "unknown",
          type: "post",
          profile: "",
          targetUrl: p.post_url || "",
          content: (p.repurposed_text || "").slice(0, 300),
          status: p.status || "draft",
        });
      }
    } catch (e) {
      console.error("SNS DB read error:", e);
    }
    snsDb.close();
  }

  // 2. Master DB - reddit_engagement
  const masterDb = await getLocalDB(MASTER_DB_PATH);
  if (masterDb) {
    try {
      const engagements = masterDb.prepare(
        `SELECT id, post_id, subreddit, post_title, comment_text, engagement_type, status, created_at, posted_at
         FROM reddit_engagement
         WHERE date(COALESCE(posted_at, created_at)) = ?
         ORDER BY COALESCE(posted_at, created_at) DESC`
      ).all(date) as any[];

      for (const e of engagements) {
        const ts = e.posted_at || e.created_at;
        activities.push({
          id: `master-eng-${e.id}`,
          date,
          time: ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
          platform: "reddit",
          type: e.engagement_type === "comment" ? "comment" : e.engagement_type === "reply" ? "reply" : "upvote",
          profile: "",
          targetUrl: e.post_id ? `https://reddit.com/comments/${e.post_id}` : "",
          content: e.comment_text || e.post_title || "",
          status: e.status || "pending",
          subreddit: e.subreddit || "",
        });
      }
    } catch (e) {
      console.error("Master DB read error:", e);
    }
    masterDb.close();
  }

  // 3. Engagement DB - engagement_actions
  const engDb = await getLocalDB(ENGAGEMENT_DB_PATH);
  if (engDb) {
    try {
      const actions = engDb.prepare(
        `SELECT id, profile, action_type, platform, subreddit, post_url, comment_text, status, created_at
         FROM engagement_actions
         WHERE date(created_at) = ?
         ORDER BY created_at DESC`
      ).all(date) as any[];

      for (const a of actions) {
        activities.push({
          id: `eng-${a.id}`,
          date,
          time: a.created_at ? new Date(a.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
          platform: a.platform || "reddit",
          type: a.action_type || "comment",
          profile: a.profile || "",
          targetUrl: a.post_url || "",
          content: (a.comment_text || "").slice(0, 300),
          status: a.status || "posted",
          subreddit: a.subreddit || "",
        });
      }
    } catch (e) {
      console.error("Engagement DB read error:", e);
    }
    engDb.close();
  }

  // 4. Penetration log
  if (existsSync(PENETRATION_LOG)) {
    try {
      const lines = readFileSync(PENETRATION_LOG, "utf-8").trim().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const entryDate = (entry.date || entry.timestamp || "").split("T")[0];
          if (entryDate === date) {
            activities.push({
              id: `pen-${entry.id || Math.random().toString(36).slice(2)}`,
              date,
              time: entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
              platform: entry.platform || "reddit",
              type: "penetration",
              profile: entry.profile || entry.asker || entry.responder || "",
              targetUrl: entry.url || "",
              content: (entry.content || entry.text || "").slice(0, 300),
              status: "posted",
              subreddit: entry.subreddit || "",
            });
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  // 5. Engagement pattern JSON logs (sns_data/engagement_patterns/)
  if (existsSync(ENGAGEMENT_PATTERNS_DIR)) {
    try {
      const files = readdirSync(ENGAGEMENT_PATTERNS_DIR).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        try {
          const raw = readFileSync(path.join(ENGAGEMENT_PATTERNS_DIR, file), "utf-8");
          const objects: any[] = [];
          try {
            objects.push(JSON.parse(raw));
          } catch {
            const parts = raw.split(/\}\s*\{/).map((p, i, arr) => {
              if (i === 0) return p + "}";
              if (i === arr.length - 1) return "{" + p;
              return "{" + p + "}";
            });
            for (const part of parts) {
              try { objects.push(JSON.parse(part)); } catch { /* skip */ }
            }
          }

          for (const data of objects) {
            const logDate = data.date || "";
            if (logDate !== date) continue;

            const entries = data.engagements || data.comments || data.comments_to_post || [];
            for (const e of entries) {
              const ts = e.timestamp || e.time_posted || data.time || "";
              activities.push({
                id: `pat-${file}-${e.id || Math.random().toString(36).slice(2)}`,
                date,
                time: ts && ts.includes("T")
                  ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                  : ts,
                platform: e.platform || "reddit",
                type: "comment",
                profile: e.profile || data.summary?.profile || "",
                targetUrl: e.post_url || "",
                content: (e.comment_content || e.comment_text || e.comment || "").slice(0, 300),
                status: data.status === "browser_control_unavailable" ? "failed" : (e.status || "planned"),
                subreddit: (e.subreddit || "").replace("r/", ""),
              });
            }
          }
        } catch { /* skip bad files */ }
      }
    } catch { /* skip */ }
  }

  return activities;
}

async function getLocalCalendarDays(month: string): Promise<CalendarDay[]> {
  // month = "YYYY-MM"
  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const days: CalendarDay[] = [];

  // Build a map from all sources
  const dayCounts: Record<string, { total: number; posts: number; comments: number; platforms: Set<string> }> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    dayCounts[dateStr] = { total: 0, posts: 0, comments: 0, platforms: new Set() };
  }

  // Query each DB for counts in this month
  const monthPrefix = `${year}-${String(mon).padStart(2, "0")}`;

  // SNS Content DB
  const snsDb = await getLocalDB(SNS_DB_PATH);
  if (snsDb) {
    try {
      const commentCounts = snsDb.prepare(
        `SELECT date(posted_at) as d, COUNT(*) as cnt, platform
         FROM posted_comments
         WHERE posted_at LIKE ?
         GROUP BY date(posted_at), platform`
      ).all(`${monthPrefix}%`) as any[];

      for (const row of commentCounts) {
        if (dayCounts[row.d]) {
          dayCounts[row.d].total += row.cnt;
          dayCounts[row.d].comments += row.cnt;
          dayCounts[row.d].platforms.add(row.platform);
        }
      }

      const postCounts = snsDb.prepare(
        `SELECT date(COALESCE(posted_at, scheduled_at, created_at)) as d, COUNT(*) as cnt, platform
         FROM repurposed_content
         WHERE COALESCE(posted_at, scheduled_at, created_at) LIKE ?
         GROUP BY d, platform`
      ).all(`${monthPrefix}%`) as any[];

      for (const row of postCounts) {
        if (dayCounts[row.d]) {
          dayCounts[row.d].total += row.cnt;
          dayCounts[row.d].posts += row.cnt;
          dayCounts[row.d].platforms.add(row.platform);
        }
      }
    } catch { /* skip */ }
    snsDb.close();
  }

  // Master DB
  const masterDb = await getLocalDB(MASTER_DB_PATH);
  if (masterDb) {
    try {
      const engCounts = masterDb.prepare(
        `SELECT date(COALESCE(posted_at, created_at)) as d, COUNT(*) as cnt, engagement_type
         FROM reddit_engagement
         WHERE COALESCE(posted_at, created_at) LIKE ?
         GROUP BY d, engagement_type`
      ).all(`${monthPrefix}%`) as any[];

      for (const row of engCounts) {
        if (dayCounts[row.d]) {
          dayCounts[row.d].total += row.cnt;
          if (row.engagement_type === "comment" || row.engagement_type === "reply") {
            dayCounts[row.d].comments += row.cnt;
          } else {
            dayCounts[row.d].posts += row.cnt;
          }
          dayCounts[row.d].platforms.add("reddit");
        }
      }
    } catch { /* skip */ }
    masterDb.close();
  }

  // Engagement DB
  const engDb = await getLocalDB(ENGAGEMENT_DB_PATH);
  if (engDb) {
    try {
      const actionCounts = engDb.prepare(
        `SELECT date(created_at) as d, COUNT(*) as cnt, action_type, platform
         FROM engagement_actions
         WHERE created_at LIKE ?
         GROUP BY d, action_type, platform`
      ).all(`${monthPrefix}%`) as any[];

      for (const row of actionCounts) {
        if (dayCounts[row.d]) {
          dayCounts[row.d].total += row.cnt;
          if (row.action_type === "post") {
            dayCounts[row.d].posts += row.cnt;
          } else {
            dayCounts[row.d].comments += row.cnt;
          }
          dayCounts[row.d].platforms.add(row.platform || "reddit");
        }
      }
    } catch { /* skip */ }
    engDb.close();
  }

  // Engagement pattern JSON logs
  if (existsSync(ENGAGEMENT_PATTERNS_DIR)) {
    try {
      const files = readdirSync(ENGAGEMENT_PATTERNS_DIR).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        try {
          const raw = readFileSync(path.join(ENGAGEMENT_PATTERNS_DIR, file), "utf-8");
          const objects: any[] = [];
          try { objects.push(JSON.parse(raw)); } catch {
            const parts = raw.split(/\}\s*\{/).map((p, i, arr) => {
              if (i === 0) return p + "}";
              if (i === arr.length - 1) return "{" + p;
              return "{" + p + "}";
            });
            for (const part of parts) { try { objects.push(JSON.parse(part)); } catch { /* skip */ } }
          }

          for (const data of objects) {
            const logDate = data.date || "";
            if (!logDate.startsWith(monthPrefix)) continue;
            if (!dayCounts[logDate]) continue;

            const entries = data.engagements || data.comments || data.comments_to_post || [];
            dayCounts[logDate].total += entries.length;
            dayCounts[logDate].comments += entries.length;
            dayCounts[logDate].platforms.add("reddit");
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  // Penetration log
  if (existsSync(PENETRATION_LOG)) {
    try {
      const lines = readFileSync(PENETRATION_LOG, "utf-8").trim().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const entryDate = (entry.date || "").split("T")[0];
          if (entryDate.startsWith(monthPrefix) && dayCounts[entryDate]) {
            dayCounts[entryDate].total += 1;
            dayCounts[entryDate].comments += 1;
            dayCounts[entryDate].platforms.add("reddit");
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  for (const [date, counts] of Object.entries(dayCounts)) {
    if (counts.total > 0) {
      days.push({
        date,
        totalActivities: counts.total,
        posts: counts.posts,
        comments: counts.comments,
        platforms: Array.from(counts.platforms),
      });
    }
  }

  return days;
}

// ============ VERCEL BLOB ============

async function getBlobActivities(): Promise<SNSActivity[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    const dataBlob = blobs.find(b => b.pathname === `${BLOB_PREFIX}/activities.json`);
    if (!dataBlob) return [];
    const response = await fetch(dataBlob.url);
    return await response.json();
  } catch {
    return [];
  }
}

// ============ API HANDLER ============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const date = searchParams.get("date");
    const month = searchParams.get("month");

    // Calendar overview for a month
    if (action === "calendar") {
      const targetMonth = month || new Date().toISOString().slice(0, 7);

      if (!IS_VERCEL) {
        const days = await getLocalCalendarDays(targetMonth);
        return NextResponse.json({ month: targetMonth, days });
      }

      // Vercel - compute from blob
      const all = await getBlobActivities();
      const dayMap: Record<string, CalendarDay> = {};
      for (const a of all) {
        if (a.date.startsWith(targetMonth)) {
          if (!dayMap[a.date]) {
            dayMap[a.date] = { date: a.date, totalActivities: 0, posts: 0, comments: 0, platforms: [] };
          }
          dayMap[a.date].totalActivities++;
          if (a.type === "post") dayMap[a.date].posts++;
          else dayMap[a.date].comments++;
          if (!dayMap[a.date].platforms.includes(a.platform)) {
            dayMap[a.date].platforms.push(a.platform);
          }
        }
      }

      return NextResponse.json({ month: targetMonth, days: Object.values(dayMap) });
    }

    // Activities for a specific date
    if (date) {
      if (!IS_VERCEL) {
        const activities = await getLocalActivitiesForDate(date);
        return NextResponse.json({ date, activities, total: activities.length });
      }

      const all = await getBlobActivities();
      const filtered = all.filter(a => a.date === date);
      return NextResponse.json({ date, activities: filtered, total: filtered.length });
    }

    // Default: today's activities + this month's calendar
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = today.slice(0, 7);

    if (!IS_VERCEL) {
      const [activities, days] = await Promise.all([
        getLocalActivitiesForDate(today),
        getLocalCalendarDays(thisMonth),
      ]);

      return NextResponse.json({
        today,
        month: thisMonth,
        activities,
        days,
        totalToday: activities.length,
      });
    }

    // Vercel
    const all = await getBlobActivities();
    const todayActivities = all.filter(a => a.date === today);
    const dayMap: Record<string, CalendarDay> = {};
    for (const a of all) {
      if (a.date.startsWith(thisMonth)) {
        if (!dayMap[a.date]) {
          dayMap[a.date] = { date: a.date, totalActivities: 0, posts: 0, comments: 0, platforms: [] };
        }
        dayMap[a.date].totalActivities++;
        if (a.type === "post") dayMap[a.date].posts++;
        else dayMap[a.date].comments++;
        if (!dayMap[a.date].platforms.includes(a.platform)) {
          dayMap[a.date].platforms.push(a.platform);
        }
      }
    }

    return NextResponse.json({
      today,
      month: thisMonth,
      activities: todayActivities,
      days: Object.values(dayMap),
      totalToday: todayActivities.length,
    });
  } catch (error) {
    console.error("SNS Calendar API error:", error);
    return NextResponse.json({ error: "Failed to fetch SNS calendar data", details: String(error) }, { status: 500 });
  }
}

// POST - Sync data from local to Vercel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get("x-sync-token");
    if (token !== process.env.SYNC_TOKEN && process.env.SYNC_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (body.action === "sync" && body.activities) {
      await put(`${BLOB_PREFIX}/activities.json`, JSON.stringify(body.activities), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return NextResponse.json({ success: true, synced: body.activities.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("SNS Calendar sync error:", error);
    return NextResponse.json({ error: "Failed to sync", details: String(error) }, { status: 500 });
  }
}
