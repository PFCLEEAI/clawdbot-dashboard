"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemoryGraph } from "@/components/memory/MemoryGraph";
import { NoteViewer } from "@/components/memory/NoteViewer";

// ============ TYPES ============

interface MemoryNote {
  slug: string;
  path: string;
  title: string;
  type: string;
  tags: string[];
  date?: string;
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

interface CalendarDay {
  date: string;
  hasNote: boolean;
  linkCount: number;
  excerpt: string;
}

// ============ CALENDAR COMPONENT ============

function MiniCalendar({
  days,
  currentMonth,
  onMonthChange,
  onDateClick,
  selectedDate,
}: {
  days: CalendarDay[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDateClick: (date: string) => void;
  selectedDate: string | null;
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const today = new Date().toISOString().split("T")[0];

  const cells: React.ReactNode[] = [];
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Header row
  for (const wd of weekDays) {
    cells.push(
      <div key={`h-${wd}`} className="text-center text-xs text-muted-foreground font-medium py-1">
        {wd}
      </div>
    );
  }

  // Blank cells
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`b-${i}`} />);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayData = dayMap.get(dateStr);
    const isToday = dateStr === today;
    const isSelected = dateStr === selectedDate;

    cells.push(
      <button
        key={dateStr}
        onClick={() => onDateClick(dateStr)}
        className={`relative text-center text-xs p-1 rounded transition-colors ${
          isSelected
            ? "bg-primary text-primary-foreground"
            : isToday
              ? "bg-blue-500/10 text-blue-500 font-bold"
              : "hover:bg-muted"
        }`}
      >
        {d}
        {dayData?.hasNote && (
          <span
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
              isSelected ? "bg-primary-foreground" : "bg-blue-500"
            }`}
          />
        )}
      </button>
    );
  }

  const prevMonth = () => onMonthChange(new Date(year, month - 1, 1));
  const nextMonth = () => onMonthChange(new Date(year, month + 1, 1));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            ←
          </Button>
          <CardTitle className="text-sm">
            {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            →
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-0.5">{cells}</div>
      </CardContent>
    </Card>
  );
}

// ============ MAIN PAGE ============

type ViewMode = "graph" | "timeline" | "note";

const NOTE_TYPES = ["daily", "project", "user", "reference", "feedback", "moc"];

export default function MemoryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [noteData, setNoteData] = useState<{ note: MemoryNote; backlinks: Backlink[] } | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterTypes, setFilterTypes] = useState<string[]>(NOTE_TYPES);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemoryNote[] | null>(null);
  const [allNotes, setAllNotes] = useState<MemoryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  // Fetch graph data
  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch("/api/memory?action=graph");
      const data = await res.json();
      setGraphData(data);
    } catch (e) {
      console.error("Failed to fetch graph:", e);
    }
  }, []);

  // Fetch calendar data
  const fetchCalendar = useCallback(async (month: Date) => {
    try {
      const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/memory?action=calendar&month=${monthStr}`);
      const data = await res.json();
      setCalendarDays(data.days || []);
    } catch (e) {
      console.error("Failed to fetch calendar:", e);
    }
  }, []);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/memory");
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      console.error("Failed to fetch summary:", e);
    }
  }, []);

  // Fetch all notes for timeline
  const fetchAllNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/memory?action=search&q=");
      const data = await res.json();
      setAllNotes(data.results || []);
    } catch {
      // fallback
    }
  }, []);

  // Fetch single note
  const fetchNote = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`/api/memory?note=${encodeURIComponent(slug)}`);
      if (!res.ok) {
        setNoteData(null);
        return;
      }
      const data = await res.json();
      setNoteData(data);
    } catch (e) {
      console.error("Failed to fetch note:", e);
      setNoteData(null);
    }
  }, []);

  // Search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await fetch(`/api/memory?action=search&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults(null);
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([fetchGraph(), fetchCalendar(currentMonth), fetchSummary(), fetchAllNotes()]).then(
      () => setLoading(false)
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Month change
  useEffect(() => {
    fetchCalendar(currentMonth);
  }, [currentMonth, fetchCalendar]);

  // Note selection
  useEffect(() => {
    if (selectedNote) {
      fetchNote(selectedNote);
      setViewMode("note");
    }
  }, [selectedNote, fetchNote]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  const handleNodeClick = (slug: string) => {
    setSelectedNote(slug);
  };

  const handleDateClick = (date: string) => {
    // Try to open the daily note for that date
    setSelectedNote(date);
  };

  const toggleTypeFilter = (type: string) => {
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const allSlugs = graphData?.nodes.filter((n) => n.exists).map((n) => n.id) || [];
  const todaySlug = new Date().toISOString().split("T")[0];

  // Filter graph by type
  const filteredGraph: GraphData | null = graphData
    ? {
        ...graphData,
        nodes: graphData.nodes.filter(
          (n) => filterTypes.includes(n.type) || n.type === "phantom"
        ),
        edges: graphData.edges.filter((e) => {
          const srcNode = graphData.nodes.find((n) => n.id === e.source);
          const tgtNode = graphData.nodes.find((n) => n.id === e.target);
          return (
            (srcNode && (filterTypes.includes(srcNode.type) || srcNode.type === "phantom")) &&
            (tgtNode && (filterTypes.includes(tgtNode.type) || tgtNode.type === "phantom"))
          );
        }),
      }
    : null;

  // Timeline notes filtered by type
  const timelineNotes = allNotes
    .filter((n) => filterTypes.includes(n.type))
    .sort((a, b) => (b.date || b.updated || "").localeCompare(a.date || a.updated || ""));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl animate-pulse inline-block">🧠</span>
          <p className="mt-4 text-muted-foreground">Loading memory vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                ← Dashboard
              </Button>
            </Link>
            <span className="text-2xl">🧠</span>
            <h1 className="text-xl font-semibold">Memory Vault</h1>
            {summary && (
              <Badge variant="outline">{summary.totalNotes} notes</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {summary?.hasTodayMemo ? (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                Today&apos;s memo ✓
              </Badge>
            ) : (
              <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                No memo today
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="space-y-4">
            {/* Search */}
            <Card>
              <CardContent className="pt-4">
                <input
                  type="text"
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                {searchResults && searchResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.slug}
                        onClick={() => {
                          setSelectedNote(r.slug);
                          setSearchQuery("");
                          setSearchResults(null);
                        }}
                        className="w-full text-left p-2 rounded hover:bg-muted/50 text-xs"
                      >
                        <div className="font-medium">{r.title}</div>
                        <div className="text-muted-foreground truncate">{r.excerpt}</div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">No results</p>
                )}
              </CardContent>
            </Card>

            {/* Calendar */}
            <MiniCalendar
              days={calendarDays}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onDateClick={handleDateClick}
              selectedDate={selectedNote}
            />

            {/* Type Filter */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Filter by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {NOTE_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleTypeFilter(type)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                        filterTypes.includes(type) ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="capitalize">{type}</span>
                      <span className="text-muted-foreground">
                        {summary?.typeCounts?.[type] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Vault Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vault Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="font-medium">{graphData?.stats.totalNotes || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Connections</span>
                    <span className="font-medium">{graphData?.stats.totalEdges || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orphans</span>
                    <span className={`font-medium ${(graphData?.stats.orphanCount || 0) > 0 ? "text-yellow-500" : ""}`}>
                      {graphData?.stats.orphanCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phantoms</span>
                    <span className="font-medium text-muted-foreground">
                      {graphData?.stats.phantomCount || 0}
                    </span>
                  </div>
                </div>
                {graphData?.stats.bridgeNotes && graphData.stats.bridgeNotes.length > 0 && (
                  <div className="mt-3 pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Most connected</p>
                    <div className="flex flex-wrap gap-1">
                      {graphData.stats.bridgeNotes.slice(0, 3).map((slug) => (
                        <button
                          key={slug}
                          onClick={() => setSelectedNote(slug)}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          {slug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* View Tabs */}
            <div className="flex items-center gap-1 mb-4">
              {(["graph", "timeline", "note"] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                >
                  {mode === "graph" && "🕸️ "}
                  {mode === "timeline" && "📅 "}
                  {mode === "note" && "📝 "}
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ))}
              {selectedNote && viewMode === "note" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedNote(null);
                    setNoteData(null);
                    setViewMode("graph");
                  }}
                  className="ml-auto"
                >
                  ✕ Close note
                </Button>
              )}
            </div>

            {/* Graph View */}
            {viewMode === "graph" && filteredGraph && (
              <MemoryGraph
                graph={filteredGraph}
                onNodeClick={handleNodeClick}
                selectedNode={selectedNote || undefined}
                todaySlug={todaySlug}
              />
            )}

            {/* Timeline View */}
            {viewMode === "timeline" && (
              <Card>
                <CardContent className="pt-4">
                  {timelineNotes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-2xl mb-2">📭</p>
                      <p>No notes match the current filters</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {timelineNotes.map((note) => (
                        <button
                          key={note.slug}
                          onClick={() => setSelectedNote(note.slug)}
                          className={`w-full text-left p-3 rounded-lg transition-colors border ${
                            selectedNote === note.slug
                              ? "bg-primary/5 border-primary/20"
                              : "border-transparent hover:bg-muted/50 hover:border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {note.type}
                            </Badge>
                            <span className="text-sm font-medium">{note.title}</span>
                            {note.date && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {note.date}
                              </span>
                            )}
                          </div>
                          {note.excerpt && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {note.excerpt}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Note View */}
            {viewMode === "note" && (
              <Card>
                <CardContent className="pt-4">
                  <NoteViewer
                    note={noteData?.note || null}
                    backlinks={noteData?.backlinks || []}
                    onWikilinkClick={handleNodeClick}
                    allSlugs={allSlugs}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
