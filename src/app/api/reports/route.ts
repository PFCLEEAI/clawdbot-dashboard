import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import { readFileSync, existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const HOME = process.env.HOME || "/Users/clawdbothenry";
const CLAWD = path.join(HOME, "clawd");
const ENGAGEMENT_DB = path.join(CLAWD, "reddit_db/reddit_engagement.db");
const MARKETING_DIR = path.join(CLAWD, "reddit_marketing");
const SAAS_RESULTS = path.join(CLAWD, "saas_hunter_results.jsonl");

function getEngagementData() {
  const profiles = [
    "sns-1-ai-researcher", "sns-2-mac-dev", "sns-3-ai-enthusiast",
    "sns-4-macos-power", "sns-5-ai-ethics", "sns-6-saas-marketer",
    "sns-7-productivity", "sns-8-automation", "sns-9-operations", "sns-10-extra",
  ];

  if (!existsSync(ENGAGEMENT_DB)) {
    return {
      engagement: profiles.map((p) => ({
        profile: p, totalPosted: 0, lastPostedAt: null, todayCount: 0,
      })),
      sonicribe: { todayCount: 0, limit: 1 },
    };
  }

  const db = new Database(ENGAGEMENT_DB, { readonly: true });
  const today = new Date().toISOString().split("T")[0];

  const engagement = profiles.map((profile) => {
    const totalRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM engagement_actions WHERE profile = ? AND status = 'posted'"
    ).get(profile) as any;

    const lastRow = db.prepare(
      "SELECT created_at FROM engagement_actions WHERE profile = ? AND status = 'posted' ORDER BY created_at DESC LIMIT 1"
    ).get(profile) as any;

    const todayRow = db.prepare(
      "SELECT count FROM daily_limits WHERE profile = ? AND date = ?"
    ).get(profile, today) as any;

    return {
      profile,
      totalPosted: totalRow?.cnt || 0,
      lastPostedAt: lastRow?.created_at || null,
      todayCount: todayRow?.count || 0,
    };
  });

  // Sonicribe daily count
  let sonicribeTodayCount = 0;
  try {
    const sRow = db.prepare("SELECT count FROM sonicribe_daily WHERE date = ?").get(today) as any;
    sonicribeTodayCount = sRow?.count || 0;
  } catch {
    // Table might not exist yet
  }

  db.close();

  return {
    engagement,
    sonicribe: { todayCount: sonicribeTodayCount, limit: 1 },
  };
}

function getXPainPoints(): any[] {
  if (!existsSync(SAAS_RESULTS)) return [];

  try {
    const content = readFileSync(SAAS_RESULTS, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    // Get last 50 lines, parse, filter X source and recent (5 days)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

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

    return results.slice(-20); // Last 20
  } catch {
    return [];
  }
}

function getRedditOpportunities(): { opportunities: any[]; lastScanAt: string | null } {
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const scanFile = path.join(MARKETING_DIR, `scan_results_${today}.json`);

  if (!existsSync(scanFile)) {
    // Try yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0].replace(/-/g, "");
    const yFile = path.join(MARKETING_DIR, `scan_results_${yStr}.json`);
    if (!existsSync(yFile)) return { opportunities: [], lastScanAt: null };
    try {
      const data = JSON.parse(readFileSync(yFile, "utf-8"));
      return {
        opportunities: (data.opportunities || []).slice(0, 15).map((o: any) => ({
          title: o.title || "Untitled",
          url: o.url || "",
          subreddit: o.subreddit || "",
          persona: o.persona || "",
        })),
        lastScanAt: data.timestamp || null,
      };
    } catch { return { opportunities: [], lastScanAt: null }; }
  }

  try {
    const data = JSON.parse(readFileSync(scanFile, "utf-8"));
    return {
      opportunities: (data.opportunities || []).slice(0, 15).map((o: any) => ({
        title: o.title || "Untitled",
        url: o.url || "",
        subreddit: o.subreddit || "",
        persona: o.persona || "",
      })),
      lastScanAt: data.timestamp || null,
    };
  } catch {
    return { opportunities: [], lastScanAt: null };
  }
}

export async function GET() {
  try {
    const { engagement, sonicribe } = getEngagementData();
    const xPainPoints = getXPainPoints();
    const { opportunities, lastScanAt } = getRedditOpportunities();

    return NextResponse.json({
      engagement,
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
