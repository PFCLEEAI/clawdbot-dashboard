import { NextRequest, NextResponse } from "next/server";
import { list, put } from "@vercel/blob";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BLOB_PREFIX = "memory";
const IS_VERCEL = process.env.VERCEL === "1";
const HOME = process.env.HOME || "";
const VAULT_PATH = path.join(HOME, ".clawdbot/memory");

// ============ TYPES ============

interface MemoryNote {
  slug: string;
  path: string;
  title: string;
  type: string;
  tags: string[];
  date?: string;
  aliases: string[];
  content: string;
  outlinks: string[];
  excerpt: string;
  updated?: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
  exists: boolean;
  linkCount: number;
  group: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNotes: number;
    totalEdges: number;
    orphanCount: number;
    phantomCount: number;
    bridgeNotes: string[];
  };
}

interface Backlink {
  slug: string;
  title: string;
  type: string;
  context: string;
}

interface MemoryCalendarDay {
  date: string;
  hasNote: boolean;
  linkCount: number;
  excerpt: string;
}

// ============ PARSING ============

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const SKIP_DIRS = new Set([".obsidian", "_templates", "_attachments"]);

function parseFrontmatter(raw: string): { meta: Record<string, any>; body: string } {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) return { meta: {}, body: raw };

  const endIdx = trimmed.indexOf("---", 3);
  if (endIdx === -1) return { meta: {}, body: raw };

  const yamlBlock = trimmed.slice(3, endIdx).trim();
  const body = trimmed.slice(endIdx + 3).trim();
  const meta: Record<string, any> = {};

  for (const line of yamlBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    // Handle arrays like [daily, moc]
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[key] = val.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    } else if (val.startsWith('"') && val.endsWith('"')) {
      meta[key] = val.slice(1, -1);
    } else {
      meta[key] = val;
    }
  }

  return { meta, body };
}

function extractWikilinks(text: string): string[] {
  const links: string[] = [];
  let match;
  const re = new RegExp(WIKILINK_RE.source, "g");
  while ((match = re.exec(text)) !== null) {
    const target = match[1].trim().toLowerCase();
    if (target && !links.includes(target)) {
      links.push(target);
    }
  }
  return links;
}

function slugFromPath(filePath: string): string {
  return path.basename(filePath, ".md").toLowerCase();
}

function extractTitle(body: string, slug: string): string {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : slug;
}

function parseMarkdownFile(filePath: string, vaultRoot: string): MemoryNote {
  const raw = readFileSync(filePath, "utf-8");
  const { meta, body } = parseFrontmatter(raw);
  const slug = slugFromPath(filePath);
  const relPath = path.relative(vaultRoot, filePath);
  const folder = path.dirname(relPath).split("/")[0];
  const stat = statSync(filePath);

  const tags = Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : [];
  const aliases = Array.isArray(meta.aliases) ? meta.aliases : meta.aliases ? [meta.aliases] : [];
  const outlinks = extractWikilinks(raw);
  const contentLines = body.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  const excerpt = contentLines.slice(0, 3).join(" ").slice(0, 200);

  return {
    slug,
    path: relPath,
    title: extractTitle(body, slug),
    type: meta.type || folder || "unknown",
    tags,
    date: meta.date || undefined,
    aliases,
    content: body,
    outlinks,
    excerpt,
    updated: meta.updated || stat.mtime.toISOString().split("T")[0],
  };
}

// ============ LOCAL VAULT ============

function getAllLocalNotes(): MemoryNote[] {
  if (!existsSync(VAULT_PATH)) return [];

  const notes: MemoryNote[] = [];

  function walk(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(fullPath);
      } else if (entry.name.endsWith(".md")) {
        try {
          notes.push(parseMarkdownFile(fullPath, VAULT_PATH));
        } catch {
          // skip unparseable files
        }
      }
    }
  }

  walk(VAULT_PATH);
  return notes;
}

function buildGraphData(notes: MemoryNote[]): GraphData {
  const slugMap = new Map<string, MemoryNote>();
  for (const note of notes) {
    slugMap.set(note.slug, note);
    for (const alias of note.aliases) {
      slugMap.set(alias.toLowerCase(), note);
    }
  }

  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // Create nodes for existing notes
  for (const note of notes) {
    if (nodeMap.has(note.slug)) continue;
    const folder = note.path.split("/")[0];
    nodeMap.set(note.slug, {
      id: note.slug,
      label: note.title,
      type: note.type,
      exists: true,
      linkCount: 0,
      group: folder === note.slug + ".md" ? "root" : folder,
    });
  }

  // Create edges and phantom nodes
  for (const note of notes) {
    for (const target of note.outlinks) {
      const resolvedTarget = slugMap.has(target) ? slugMap.get(target)!.slug : target;

      // Create phantom node if target doesn't exist
      if (!nodeMap.has(resolvedTarget)) {
        nodeMap.set(resolvedTarget, {
          id: resolvedTarget,
          label: resolvedTarget,
          type: "phantom",
          exists: false,
          linkCount: 0,
          group: "phantom",
        });
      }

      edges.push({ source: note.slug, target: resolvedTarget });
    }
  }

  // Count links per node
  for (const edge of edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (src) src.linkCount++;
    if (tgt) tgt.linkCount++;
  }

  const nodes = Array.from(nodeMap.values());
  const orphans = nodes.filter((n) => n.linkCount === 0 && n.exists);
  const phantoms = nodes.filter((n) => !n.exists);

  // Top 5 bridge notes (most connected)
  const bridgeNotes = [...nodes]
    .filter((n) => n.exists)
    .sort((a, b) => b.linkCount - a.linkCount)
    .slice(0, 5)
    .map((n) => n.id);

  return {
    nodes,
    edges,
    stats: {
      totalNotes: notes.length,
      totalEdges: edges.length,
      orphanCount: orphans.length,
      phantomCount: phantoms.length,
      bridgeNotes,
    },
  };
}

function getBacklinks(notes: MemoryNote[], targetSlug: string): Backlink[] {
  const backlinks: Backlink[] = [];

  for (const note of notes) {
    if (note.outlinks.includes(targetSlug)) {
      // Find the line containing the wikilink
      const lines = note.content.split("\n");
      const contextLine = lines.find((l) =>
        l.toLowerCase().includes(`[[${targetSlug}`) ||
        l.includes(`[[${targetSlug}`)
      ) || "";

      backlinks.push({
        slug: note.slug,
        title: note.title,
        type: note.type,
        context: contextLine.trim().slice(0, 200),
      });
    }
  }

  return backlinks;
}

function getCalendarData(notes: MemoryNote[], month: string): MemoryCalendarDay[] {
  const dailyNotes = notes.filter((n) => n.type === "daily" && n.date);
  const days: MemoryCalendarDay[] = [];

  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const note = dailyNotes.find((n) => n.date === dateStr);
    days.push({
      date: dateStr,
      hasNote: !!note,
      linkCount: note ? note.outlinks.length : 0,
      excerpt: note ? note.excerpt : "",
    });
  }

  return days;
}

function searchNotes(notes: MemoryNote[], query: string): MemoryNote[] {
  const q = query.toLowerCase();
  return notes
    .filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)) ||
        n.slug.includes(q)
    )
    .map((n) => ({ ...n, content: "" })); // strip content for search results
}

// ============ VERCEL BLOB ============

async function getBlobData(): Promise<{ notes: MemoryNote[]; graph: GraphData } | null> {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    const dataBlob = blobs.find((b) => b.pathname === `${BLOB_PREFIX}/data.json`);
    if (!dataBlob) return null;
    const response = await fetch(dataBlob.url);
    return await response.json();
  } catch {
    return null;
  }
}

// ============ API HANDLER ============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const noteSlug = searchParams.get("note");
    const month = searchParams.get("month");
    const query = searchParams.get("q");

    // Get all notes (local or blob)
    let notes: MemoryNote[];
    let graph: GraphData | null = null;

    if (IS_VERCEL) {
      const blobData = await getBlobData();
      notes = blobData?.notes || [];
      graph = blobData?.graph || null;
    } else {
      notes = getAllLocalNotes();
    }

    // Graph data
    if (action === "graph") {
      const graphData = graph || buildGraphData(notes);
      return NextResponse.json(graphData);
    }

    // Calendar data
    if (action === "calendar") {
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const days = getCalendarData(notes, targetMonth);
      return NextResponse.json({ month: targetMonth, days });
    }

    // Backlinks for a note
    if (action === "backlinks" && noteSlug) {
      const backlinks = getBacklinks(notes, noteSlug.toLowerCase());
      return NextResponse.json({ note: noteSlug, backlinks });
    }

    // Search
    if (action === "search" && query) {
      const results = searchNotes(notes, query);
      return NextResponse.json({ query, results, total: results.length });
    }

    // Single note
    if (noteSlug) {
      const note = notes.find(
        (n) => n.slug === noteSlug.toLowerCase() || n.aliases.map((a) => a.toLowerCase()).includes(noteSlug.toLowerCase())
      );
      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }
      const backlinks = getBacklinks(notes, note.slug);
      return NextResponse.json({ note, backlinks });
    }

    // Default: summary
    const today = new Date().toISOString().split("T")[0];
    const todayNote = notes.find((n) => n.date === today);
    const graphData = graph || buildGraphData(notes);

    const typeCounts: Record<string, number> = {};
    for (const n of notes) {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    }

    const recentNotes = [...notes]
      .filter((n) => n.updated)
      .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""))
      .slice(0, 5)
      .map((n) => ({ slug: n.slug, title: n.title, type: n.type, date: n.date, updated: n.updated }));

    return NextResponse.json({
      today,
      hasTodayMemo: !!todayNote,
      todayExcerpt: todayNote?.excerpt || "",
      totalNotes: notes.length,
      typeCounts,
      recentNotes,
      graphStats: graphData.stats,
    });
  } catch (error) {
    console.error("Memory API error:", error);
    return NextResponse.json({ error: "Failed to fetch memory data", details: String(error) }, { status: 500 });
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

    if (body.action === "sync" && body.notes && body.graph) {
      await put(
        `${BLOB_PREFIX}/data.json`,
        JSON.stringify({ notes: body.notes, graph: body.graph, syncedAt: new Date().toISOString() }),
        { access: "public", addRandomSuffix: false, allowOverwrite: true }
      );
      return NextResponse.json({ success: true, synced: body.notes.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Memory sync error:", error);
    return NextResponse.json({ error: "Failed to sync", details: String(error) }, { status: 500 });
  }
}
