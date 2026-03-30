import { NextRequest, NextResponse } from "next/server";
import { list, put } from "@vercel/blob";
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BLOB_PREFIX = "reports";
const IS_VERCEL = process.env.VERCEL === "1";

const HOME = process.env.HOME || "";
const CLAWD = path.join(HOME, "clawd");
const ENGAGEMENT_DB = path.join(CLAWD, "reddit_db/reddit_engagement.db");
const MARKETING_DIR = path.join(CLAWD, "reddit_marketing");
const SAAS_RESULTS = path.join(CLAWD, "saas_hunter_results.jsonl");
const ENGAGEMENT_PATTERNS_DIR = path.join(CLAWD, "sns_data/engagement_patterns");
const ENGAGEMENT_LOG_MD = path.join(CLAWD, "reddit_engagement_log.md");
const PENETRATION_LOG = path.join(CLAWD, "reddit_marketing/penetration_log.jsonl");

interface ActivityEntry {
  date: string;
  time: string;
  profile: string;
  platform: string;
  type: string; // "comment" | "post" | "penetration"
  subreddit: string;
  postTitle: string;
  postUrl: string;
  commentText: string;
  status: string; // "posted" | "pending" | "failed" | "planned"
}

// Parse all JSON engagement logs from sns_data/engagement_patterns/
function getEngagementPatternLogs(): ActivityEntry[] {
  const activities: ActivityEntry[] = [];
  if (!existsSync(ENGAGEMENT_PATTERNS_DIR)) return activities;

  const files = readdirSync(ENGAGEMENT_PATTERNS_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const raw = readFileSync(path.join(ENGAGEMENT_PATTERNS_DIR, file), "utf-8");
      // Some files have multiple JSON objects concatenated (not valid JSON array)
      // Try parsing as single object first, then try splitting
      const objects: any[] = [];
      try {
        const parsed = JSON.parse(raw);
        objects.push(parsed);
      } catch {
        // Try splitting by }{ or }\n{
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
        const date = data.date || "";

        // Format 1: { engagements: [...] }
        if (data.engagements && Array.isArray(data.engagements)) {
          for (const e of data.engagements) {
            activities.push({
              date: date || (e.timestamp ? e.timestamp.split("T")[0] : ""),
              time: e.timestamp
                ? new Date(e.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                : data.time || "",
              profile: e.profile || data.summary?.profile || "",
              platform: e.platform || "reddit",
              type: "comment",
              subreddit: (e.subreddit || "").replace("r/", ""),
              postTitle: e.post_title || "",
              postUrl: e.post_url || "",
              commentText: (e.comment_content || e.comment_text || "").slice(0, 300),
              status: e.status || "planned",
            });
          }
        }

        // Format 2: { comments: [...] }
        if (data.comments && Array.isArray(data.comments)) {
          for (const c of data.comments) {
            activities.push({
              date: date || "",
              time: c.time_posted || data.time || "",
              profile: c.profile || "",
              platform: "reddit",
              type: "comment",
              subreddit: (c.subreddit || "").replace("r/", ""),
              postTitle: c.post_title || "",
              postUrl: c.post_url || "",
              commentText: (c.comment || c.comment_text || "").slice(0, 300),
              status: c.status || "planned",
            });
          }
        }

        // Format 3: { comments_to_post: [...] }
        if (data.comments_to_post && Array.isArray(data.comments_to_post)) {
          for (const c of data.comments_to_post) {
            activities.push({
              date: date || "",
              time: data.time || "",
              profile: c.profile || data.summary?.profile || "",
              platform: "reddit",
              type: "comment",
              subreddit: (c.subreddit || "").replace("r/", ""),
              postTitle: c.post_title || "",
              postUrl: c.post_url || "",
              commentText: (c.comment_text || "").slice(0, 300),
              status: data.status === "browser_control_unavailable" ? "failed" : (c.status || "pending"),
            });
          }
        }
      }
    } catch { /* skip bad files */ }
  }

  return activities;
}

// Parse engagement_actions from DB
function getDBEngagementActions(): ActivityEntry[] {
  const activities: ActivityEntry[] = [];
  if (!existsSync(ENGAGEMENT_DB)) return activities;

  try {
    const Database = require("better-sqlite3");
    const db = new Database(ENGAGEMENT_DB, { readonly: true });

    const rows = db.prepare(
      `SELECT id, profile, post_url, subreddit, comment_text, mode, status, error_msg, created_at
       FROM engagement_actions ORDER BY created_at DESC`
    ).all() as any[];

    for (const r of rows) {
      activities.push({
        date: r.created_at ? r.created_at.split(" ")[0] : "",
        time: r.created_at
          ? new Date(r.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : "",
        profile: r.profile || "",
        platform: "reddit",
        type: "comment",
        subreddit: r.subreddit || "",
        postTitle: "",
        postUrl: r.post_url || "",
        commentText: (r.comment_text || "").slice(0, 300),
        status: r.status || "unknown",
      });
    }

    // Sonicribe daily count
    let sonicribeTodayCount = 0;
    const today = new Date().toISOString().split("T")[0];
    try {
      const sRow = db.prepare("SELECT count FROM sonicribe_daily WHERE date = ?").get(today) as any;
      sonicribeTodayCount = sRow?.count || 0;
    } catch { /* table might not exist */ }

    db.close();
    return activities;
  } catch {
    return activities;
  }
}

// Parse penetration log
function getPenetrationActions(): ActivityEntry[] {
  const activities: ActivityEntry[] = [];
  if (!existsSync(PENETRATION_LOG)) return activities;

  try {
    const lines = readFileSync(PENETRATION_LOG, "utf-8").trim().split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        activities.push({
          date: entry.date || "",
          time: "",
          profile: `${entry.asker || ""} → ${entry.responder || ""}`,
          platform: "reddit",
          type: "penetration",
          subreddit: entry.subreddit || "",
          postTitle: `Penetration: ${entry.angle || ""}`,
          postUrl: entry.url || "",
          commentText: `Asker: ${entry.asker}, Responder: ${entry.responder}, Delay: ${entry.delay_hours || 0}h`,
          status: "posted",
        });
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return activities;
}

// Get sonicribe daily count
function getSonicribeCount(): { todayCount: number; limit: number } {
  if (!existsSync(ENGAGEMENT_DB)) return { todayCount: 0, limit: 1 };
  try {
    const Database = require("better-sqlite3");
    const db = new Database(ENGAGEMENT_DB, { readonly: true });
    const today = new Date().toISOString().split("T")[0];
    let count = 0;
    try {
      const row = db.prepare("SELECT count FROM sonicribe_daily WHERE date = ?").get(today) as any;
      count = row?.count || 0;
    } catch { /* table might not exist */ }
    db.close();
    return { todayCount: count, limit: 1 };
  } catch {
    return { todayCount: 0, limit: 1 };
  }
}

function getXPainPoints(): any[] {
  if (!existsSync(SAAS_RESULTS)) return [];

  try {
    const content = readFileSync(SAAS_RESULTS, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    const results: any[] = [];
    for (const line of lines.slice(-100)) {
      try {
        const item = JSON.parse(line);
        if (item.source === "x") {
          results.push({
            title: item.title || "Untitled",
            url: item.url || "",
            source: "x",
            content: (item.content || "").slice(0, 200),
            huntedAt: item.hunted_at || item.huntedAt || null,
          });
        }
      } catch { /* skip bad lines */ }
    }

    return results.slice(-20);
  } catch {
    return [];
  }
}

function getRedditOpportunities(): { opportunities: any[]; lastScanAt: string | null } {
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const scanFile = path.join(MARKETING_DIR, `scan_results_${today}.json`);

  if (!existsSync(scanFile)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0].replace(/-/g, "");
    const yFile = path.join(MARKETING_DIR, `scan_results_${yStr}.json`);
    if (!existsSync(yFile)) return { opportunities: [], lastScanAt: null };
    try {
      const data = JSON.parse(readFileSync(yFile, "utf-8"));
      return {
        opportunities: (data.opportunities || []).slice(0, 15).map((o: any) => ({
          title: o.title || "Untitled", url: o.url || "", subreddit: o.subreddit || "", persona: o.persona || "",
        })),
        lastScanAt: data.timestamp || null,
      };
    } catch { return { opportunities: [], lastScanAt: null }; }
  }

  try {
    const data = JSON.parse(readFileSync(scanFile, "utf-8"));
    return {
      opportunities: (data.opportunities || []).slice(0, 15).map((o: any) => ({
        title: o.title || "Untitled", url: o.url || "", subreddit: o.subreddit || "", persona: o.persona || "",
      })),
      lastScanAt: data.timestamp || null,
    };
  } catch {
    return { opportunities: [], lastScanAt: null };
  }
}

// ============ VERCEL BLOB ============

interface BlobReportsData {
  activities: ActivityEntry[];
  profileSummaries: any[];
  totalActivities: number;
  syncedAt: string;
}

async function getBlobReportsData(): Promise<BlobReportsData | null> {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    const dataBlob = blobs.find(b => b.pathname === `${BLOB_PREFIX}/data.json`);
    if (!dataBlob) return null;
    const response = await fetch(dataBlob.url);
    return await response.json();
  } catch {
    return null;
  }
}

async function saveBlobReportsData(data: BlobReportsData) {
  await put(`${BLOB_PREFIX}/data.json`, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// ============ API HANDLERS ============

export async function GET() {
  try {
    // On Vercel, read from blob
    if (IS_VERCEL) {
      const blobData = await getBlobReportsData();
      if (blobData) {
        return NextResponse.json({
          profileSummaries: blobData.profileSummaries,
          activities: blobData.activities,
          totalActivities: blobData.totalActivities,
          sonicribe: { todayCount: 0, limit: 1 },
          xPainPoints: [],
          redditOpportunities: [],
          lastScanAt: null,
          syncedAt: blobData.syncedAt,
        });
      }
      // No blob data yet — return empty
      return NextResponse.json({
        profileSummaries: [],
        activities: [],
        totalActivities: 0,
        sonicribe: { todayCount: 0, limit: 1 },
        xPainPoints: [],
        redditOpportunities: [],
        lastScanAt: null,
      });
    }

    // Local — aggregate all activity sources
    const patternLogs = getEngagementPatternLogs();
    const dbActions = getDBEngagementActions();
    const penetrationActions = getPenetrationActions();

    // Merge and deduplicate (by post_url + profile + date)
    const allActivities = [...patternLogs, ...dbActions, ...penetrationActions];

    // Deduplicate by postUrl + profile + date
    const seen = new Set<string>();
    const deduped: ActivityEntry[] = [];
    for (const a of allActivities) {
      const key = `${a.postUrl}|${a.profile}|${a.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(a);
      }
    }

    // Sort by date descending
    deduped.sort((a, b) => b.date.localeCompare(a.date));

    // Build per-profile summary
    const profiles = [
      "sns-1-ai-researcher", "sns-2-mac-dev", "sns-3-ai-enthusiast",
      "sns-4-macos-power", "sns-5-ai-ethics", "sns-6-saas-marketer",
      "sns-7-productivity", "sns-8-automation", "sns-9-operations", "sns-10-extra",
    ];

    const profileSummaries = profiles.map((profile) => {
      const profileActivities = deduped.filter((a) => a.profile.includes(profile));
      const posted = profileActivities.filter((a) => a.status === "posted" || a.status === "planned");
      const lastActivity = profileActivities[0];

      return {
        profile,
        totalActivities: profileActivities.length,
        postedCount: posted.length,
        lastActivityDate: lastActivity?.date || null,
        lastActivitySubreddit: lastActivity?.subreddit || null,
      };
    });

    const sonicribe = getSonicribeCount();
    const xPainPoints = getXPainPoints();
    const { opportunities, lastScanAt } = getRedditOpportunities();

    return NextResponse.json({
      profileSummaries,
      activities: deduped.slice(0, 50),
      totalActivities: deduped.length,
      sonicribe,
      xPainPoints,
      redditOpportunities: opportunities,
      lastScanAt,
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

// POST - Sync data from local to Vercel (called by sync_engagement_to_vercel.py)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify sync token
    const token = request.headers.get("x-sync-token");
    if (token !== process.env.SYNC_TOKEN && process.env.SYNC_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (body.action === "sync" && body.activities) {
      const data: BlobReportsData = {
        activities: body.activities,
        profileSummaries: body.profileSummaries || [],
        totalActivities: body.totalActivities || body.activities.length,
        syncedAt: new Date().toISOString(),
      };
      await saveBlobReportsData(data);
      return NextResponse.json({ success: true, synced: body.activities.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Reports sync error:", error);
    return NextResponse.json({ error: "Failed to sync", details: String(error) }, { status: 500 });
  }
}
