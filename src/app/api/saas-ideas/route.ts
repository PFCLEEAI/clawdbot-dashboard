import { NextRequest, NextResponse } from "next/server";
import { list, put, head } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BLOB_PREFIX = "saas-ideas";
const IS_VERCEL = process.env.VERCEL === "1";

// Types
export interface SaasIdea {
  id: number;
  post_id: string;
  title: string;
  description: string;
  category: string;
  pain_score: number;
  subreddit: string;
  url: string;
  source: string;
  author: string;
  post_score: number;
  num_comments: number;
  permalink: string;
  created_at: string;
  status: string;
  notes: string | null;
  demand_volume: string | null;
  expected_price: string | null;
  expected_revenue: string | null;
  key_insight: string | null;
  competitors: string | null;
  differentiator: string | null;
  validation_status: string;
  validation_notes: string | null;
  starred: number;
  archived: number;
}

export interface StatsData {
  total_ideas: number;
  new_ideas: number;
  starred_ideas: number;
  by_category: { category: string; count: number }[];
  by_date: { date: string; count: number }[];
  by_validation: { status: string; count: number }[];
}

// ============ LOCAL SQLite (for development) ============
async function getLocalData() {
  try {
    const Database = (await import("better-sqlite3")).default;
    const path = await import("path");
    // Use the new clean master database
    const DB_PATH = path.join(
      process.env.HOME || "/Users/clawdbothenry",
      "clawd/clawdbot_db/clawdbot_master.db"
    );
    return new Database(DB_PATH, { readonly: false });
  } catch {
    return null;
  }
}

async function getLocalIdeas(params: URLSearchParams): Promise<{ ideas: SaasIdea[]; total: number }> {
  const db = await getLocalData();
  if (!db) return { ideas: [], total: 0 };

  const date = params.get("date");
  const category = params.get("category");
  const starred = params.get("starred");
  const search = params.get("search");
  const limit = parseInt(params.get("limit") || "100");
  const offset = parseInt(params.get("offset") || "0");

  let query = `SELECT *, source_url as url FROM saas_ideas WHERE archived = 0`;
  const queryParams: any[] = [];

  if (date) {
    query += ` AND date(created_at) = ?`;
    queryParams.push(date);
  }
  if (category && category !== "all") {
    query += ` AND category = ?`;
    queryParams.push(category);
  }
  if (starred === "true") {
    query += ` AND starred = 1`;
  }
  if (search) {
    query += ` AND (title LIKE ? OR description LIKE ?)`;
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY starred DESC, pain_score DESC, created_at DESC LIMIT ? OFFSET ?`;
  queryParams.push(limit, offset);

  const ideas = db.prepare(query).all(...queryParams) as SaasIdea[];
  const total = (db.prepare("SELECT COUNT(*) as count FROM saas_ideas WHERE archived = 0").get() as any).count;
  db.close();

  return { ideas, total };
}

async function getLocalStats(): Promise<StatsData> {
  const db = await getLocalData();
  if (!db) {
    return { total_ideas: 0, new_ideas: 0, starred_ideas: 0, by_category: [], by_date: [], by_validation: [] };
  }

  const total = (db.prepare("SELECT COUNT(*) as count FROM saas_ideas WHERE archived = 0").get() as any).count;
  const newCount = (db.prepare("SELECT COUNT(*) as count FROM saas_ideas WHERE status = 'new' AND archived = 0").get() as any).count;
  const starred = (db.prepare("SELECT COUNT(*) as count FROM saas_ideas WHERE starred = 1 AND archived = 0").get() as any).count;
  const byCategory = db.prepare("SELECT category, COUNT(*) as count FROM saas_ideas WHERE archived = 0 GROUP BY category ORDER BY count DESC").all() as any[];
  const byDate = db.prepare("SELECT date(created_at) as date, COUNT(*) as count FROM saas_ideas WHERE archived = 0 GROUP BY date(created_at) ORDER BY date DESC LIMIT 30").all() as any[];
  const byValidation = db.prepare("SELECT validation_status as status, COUNT(*) as count FROM saas_ideas WHERE archived = 0 GROUP BY validation_status").all() as any[];

  db.close();

  return { total_ideas: total, new_ideas: newCount, starred_ideas: starred, by_category: byCategory, by_date: byDate, by_validation: byValidation };
}

async function updateLocalIdea(id: number, updates: Partial<SaasIdea>) {
  const db = await getLocalData();
  if (!db) return null;

  const fields = Object.keys(updates);
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (updates as any)[f]);

  db.prepare(`UPDATE saas_ideas SET ${setClause} WHERE id = ?`).run(...values, id);
  const updated = db.prepare("SELECT *, source_url as url FROM saas_ideas WHERE id = ?").get(id);
  db.close();

  return updated;
}

// ============ VERCEL BLOB (for production) ============
async function getBlobData(): Promise<SaasIdea[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    const dataBlob = blobs.find(b => b.pathname === `${BLOB_PREFIX}/data.json`);
    if (!dataBlob) return [];

    const response = await fetch(dataBlob.url);
    return await response.json();
  } catch {
    return [];
  }
}

async function saveBlobData(ideas: SaasIdea[]) {
  await put(`${BLOB_PREFIX}/data.json`, JSON.stringify(ideas), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// ============ API HANDLERS ============
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Stats
    if (action === "stats") {
      if (!IS_VERCEL) {
        return NextResponse.json(await getLocalStats());
      }

      // Vercel - calculate from blob data
      const ideas = await getBlobData();
      const activeIdeas = ideas.filter(i => !i.archived);

      const byCategory: Record<string, number> = {};
      const byDate: Record<string, number> = {};
      const byValidation: Record<string, number> = {};

      activeIdeas.forEach(idea => {
        byCategory[idea.category] = (byCategory[idea.category] || 0) + 1;
        const date = idea.created_at.split("T")[0];
        byDate[date] = (byDate[date] || 0) + 1;
        byValidation[idea.validation_status] = (byValidation[idea.validation_status] || 0) + 1;
      });

      return NextResponse.json({
        total_ideas: activeIdeas.length,
        new_ideas: activeIdeas.filter(i => i.status === "new").length,
        starred_ideas: activeIdeas.filter(i => i.starred).length,
        by_category: Object.entries(byCategory).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
        by_date: Object.entries(byDate).map(([date, count]) => ({ date, count })).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
        by_validation: Object.entries(byValidation).map(([status, count]) => ({ status, count })),
      });
    }

    // Dates
    if (action === "dates") {
      if (!IS_VERCEL) {
        const db = await getLocalData();
        if (!db) return NextResponse.json({ dates: [] });
        const dates = db.prepare("SELECT DISTINCT date(created_at) as date, COUNT(*) as count FROM saas_ideas WHERE archived = 0 GROUP BY date(created_at) ORDER BY date DESC").all();
        db.close();
        return NextResponse.json({ dates });
      }

      const ideas = await getBlobData();
      const dateMap: Record<string, number> = {};
      ideas.filter(i => !i.archived).forEach(idea => {
        const date = idea.created_at.split("T")[0];
        dateMap[date] = (dateMap[date] || 0) + 1;
      });

      return NextResponse.json({
        dates: Object.entries(dateMap).map(([date, count]) => ({ date, count })).sort((a, b) => b.date.localeCompare(a.date))
      });
    }

    // Ideas list
    if (!IS_VERCEL) {
      const result = await getLocalIdeas(searchParams);
      return NextResponse.json({ ideas: result.ideas, total: result.total, limit: 100, offset: 0 });
    }

    // Vercel - filter from blob
    let ideas = await getBlobData();
    ideas = ideas.filter(i => !i.archived);

    const date = searchParams.get("date");
    const category = searchParams.get("category");
    const starred = searchParams.get("starred");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (date) ideas = ideas.filter(i => i.created_at.startsWith(date));
    if (category && category !== "all") ideas = ideas.filter(i => i.category === category);
    if (starred === "true") ideas = ideas.filter(i => i.starred);
    if (search) {
      const s = search.toLowerCase();
      ideas = ideas.filter(i => i.title.toLowerCase().includes(s) || (i.description || "").toLowerCase().includes(s));
    }

    ideas.sort((a, b) => {
      if (a.starred !== b.starred) return b.starred - a.starred;
      if (a.pain_score !== b.pain_score) return b.pain_score - a.pain_score;
      return b.created_at.localeCompare(a.created_at);
    });

    return NextResponse.json({
      ideas: ideas.slice(offset, offset + limit),
      total: ideas.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching SaaS ideas:", error);
    return NextResponse.json({ error: "Failed to fetch ideas", details: String(error) }, { status: 500 });
  }
}

// PUT - Update an idea
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    if (!IS_VERCEL) {
      const updated = await updateLocalIdea(id, updates);
      return NextResponse.json({ success: true, idea: updated });
    }

    // Vercel - update blob
    const ideas = await getBlobData();
    const index = ideas.findIndex(i => i.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    ideas[index] = { ...ideas[index], ...updates };
    await saveBlobData(ideas);

    return NextResponse.json({ success: true, idea: ideas[index] });
  } catch (error) {
    console.error("Error updating idea:", error);
    return NextResponse.json({ error: "Failed to update idea", details: String(error) }, { status: 500 });
  }
}

// DELETE - Archive an idea
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    if (!IS_VERCEL) {
      const db = await getLocalData();
      if (db) {
        db.prepare("UPDATE saas_ideas SET archived = 1 WHERE id = ?").run(id);
        db.close();
      }
      return NextResponse.json({ success: true });
    }

    // Vercel - update blob
    const ideas = await getBlobData();
    const index = ideas.findIndex(i => i.id === id);
    if (index !== -1) {
      ideas[index].archived = 1;
      await saveBlobData(ideas);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error archiving idea:", error);
    return NextResponse.json({ error: "Failed to archive idea", details: String(error) }, { status: 500 });
  }
}

// POST - Sync data from local to Vercel (called by local cron)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify sync token
    const token = request.headers.get("x-sync-token");
    if (token !== process.env.SYNC_TOKEN && process.env.SYNC_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (body.action === "sync" && body.ideas) {
      await saveBlobData(body.ideas);
      return NextResponse.json({ success: true, synced: body.ideas.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error syncing:", error);
    return NextResponse.json({ error: "Failed to sync", details: String(error) }, { status: 500 });
  }
}
