"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SaasIdea {
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

interface Stats {
  total_ideas: number;
  new_ideas: number;
  starred_ideas: number;
  by_category: { category: string; count: number }[];
  by_date: { date: string; count: number }[];
  by_validation: { status: string; count: number }[];
}

interface CalendarDate {
  date: string;
  count: number;
}

const CATEGORIES = [
  "all",
  "automation",
  "crm_sales",
  "content",
  "data_management",
  "billing_payments",
  "project_management",
  "reporting",
  "scheduling",
  "hr_hiring",
  "support",
  "security",
  "uncategorized",
];

const VALIDATION_STATUSES = [
  { value: "not_started", label: "Not Started", color: "bg-gray-500" },
  { value: "researching", label: "Researching", color: "bg-blue-500" },
  { value: "validated", label: "Validated", color: "bg-green-500" },
  { value: "rejected", label: "Rejected", color: "bg-red-500" },
  { value: "building", label: "Building", color: "bg-purple-500" },
];

export default function SaasIdeasPage() {
  const [ideas, setIdeas] = useState<SaasIdea[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [calendarDates, setCalendarDates] = useState<CalendarDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<SaasIdea | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch stats
  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/saas-ideas?action=stats");
    const data = await res.json();
    setStats(data);
  }, []);

  // Fetch calendar dates
  const fetchCalendarDates = useCallback(async () => {
    const res = await fetch("/api/saas-ideas?action=dates");
    const data = await res.json();
    setCalendarDates(data.dates || []);
  }, []);

  // Fetch ideas
  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();

    if (selectedDate) params.set("date", selectedDate);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (showStarredOnly) params.set("starred", "true");
    if (searchQuery) params.set("search", searchQuery);

    const res = await fetch(`/api/saas-ideas?${params.toString()}`);
    const data = await res.json();
    setIdeas(data.ideas || []);
    setLoading(false);
  }, [selectedDate, selectedCategory, showStarredOnly, searchQuery]);

  useEffect(() => {
    fetchStats();
    fetchCalendarDates();
  }, [fetchStats, fetchCalendarDates]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Update idea
  const updateIdea = async (id: number, updates: Partial<SaasIdea>) => {
    await fetch("/api/saas-ideas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    fetchIdeas();
    fetchStats();
    if (selectedIdea?.id === id) {
      setSelectedIdea({ ...selectedIdea, ...updates } as SaasIdea);
    }
  };

  // Toggle star
  const toggleStar = (id: number, currentStarred: number) => {
    updateIdea(id, { starred: currentStarred ? 0 : 1 });
  };

  // Archive idea
  const archiveIdea = async (id: number) => {
    await fetch(`/api/saas-ideas?id=${id}`, { method: "DELETE" });
    fetchIdeas();
    fetchStats();
    setSelectedIdea(null);
  };

  // Calendar component
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const dateCountMap = new Map(
      calendarDates.map((d) => [d.date, d.count])
    );

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = dateCountMap.get(dateStr) || 0;
      const isSelected = selectedDate === dateStr;
      const isToday = dateStr === new Date().toISOString().split("T")[0];

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(isSelected ? null : dateStr)}
          className={`
            h-10 w-full rounded-md text-sm relative
            ${isSelected ? "bg-primary text-primary-foreground" : ""}
            ${isToday && !isSelected ? "border border-primary" : ""}
            ${count > 0 && !isSelected ? "bg-muted hover:bg-muted/80" : "hover:bg-muted/50"}
          `}
        >
          {day}
          {count > 0 && (
            <span className="absolute bottom-0.5 right-0.5 text-[10px] text-muted-foreground">
              {count}
            </span>
          )}
        </button>
      );
    }

    return days;
  };

  // Pain score badge
  const getPainBadge = (score: number) => {
    if (score >= 8) return <Badge className="bg-red-500">🔥 {score}</Badge>;
    if (score >= 5) return <Badge className="bg-orange-500">⚡ {score}</Badge>;
    if (score >= 3) return <Badge className="bg-yellow-500">💡 {score}</Badge>;
    return <Badge variant="secondary">{score}</Badge>;
  };

  // Category emoji
  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      automation: "🤖",
      crm_sales: "📈",
      content: "📝",
      data_management: "📊",
      billing_payments: "💳",
      project_management: "📋",
      reporting: "📉",
      scheduling: "📅",
      hr_hiring: "👥",
      support: "🎧",
      security: "🔒",
      uncategorized: "❓",
    };
    return emojis[category] || "❓";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                ← Dashboard
              </Link>
              <h1 className="text-2xl font-bold">💡 SaaS Ideas</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {stats && (
                <>
                  <span>{stats.total_ideas} total</span>
                  <span>•</span>
                  <span>{stats.new_ideas} new</span>
                  <span>•</span>
                  <span>⭐ {stats.starred_ideas} starred</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Calendar & Filters */}
          <div className="space-y-6">
            {/* Calendar */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">📅 Calendar</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                        )
                      }
                    >
                      ←
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                        )
                      }
                    >
                      →
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={i}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setSelectedDate(null)}
                  >
                    Clear date filter
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Filters */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">🔍 Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search ideas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                />

                {/* Category */}
                <div>
                  <label className="text-xs text-muted-foreground">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === "all" ? "All Categories" : `${getCategoryEmoji(cat)} ${cat.replace("_", " ")}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Starred only */}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showStarredOnly}
                    onChange={(e) => setShowStarredOnly(e.target.checked)}
                    className="rounded"
                  />
                  ⭐ Starred only
                </label>
              </CardContent>
            </Card>

            {/* Stats by Category */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">📊 By Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {stats?.by_category.slice(0, 8).map((cat) => (
                    <div
                      key={cat.category}
                      className="flex justify-between items-center cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                      onClick={() => setSelectedCategory(cat.category)}
                    >
                      <span>
                        {getCategoryEmoji(cat.category)} {cat.category.replace("_", " ")}
                      </span>
                      <Badge variant="secondary">{cat.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Ideas Table */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {selectedDate
                      ? `Ideas from ${selectedDate}`
                      : selectedCategory !== "all"
                      ? `${getCategoryEmoji(selectedCategory)} ${selectedCategory.replace("_", " ")}`
                      : "All Ideas"}
                    <span className="ml-2 text-muted-foreground font-normal">
                      ({ideas.length})
                    </span>
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchIdeas}>
                    ↻ Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading ideas...
                  </div>
                ) : ideas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No ideas found with current filters
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-2">⭐</th>
                          <th className="pb-2 pr-4">Pain</th>
                          <th className="pb-2 pr-4">Idea</th>
                          <th className="pb-2 pr-4">Category</th>
                          <th className="pb-2 pr-4">Source</th>
                          <th className="pb-2 pr-4">Validation</th>
                          <th className="pb-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ideas.map((idea) => (
                          <tr
                            key={idea.id}
                            className="border-b hover:bg-muted/50 cursor-pointer"
                            onClick={() => setSelectedIdea(idea)}
                          >
                            <td className="py-3 pr-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStar(idea.id, idea.starred);
                                }}
                                className="hover:scale-110 transition-transform"
                              >
                                {idea.starred ? "⭐" : "☆"}
                              </button>
                            </td>
                            <td className="py-3 pr-4">{getPainBadge(idea.pain_score)}</td>
                            <td className="py-3 pr-4 max-w-md">
                              <div className="font-medium truncate">{idea.title}</div>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-xs">
                                {getCategoryEmoji(idea.category)} {idea.category.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <a
                                href={idea.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-blue-500 hover:underline text-xs"
                              >
                                r/{idea.subreddit}
                              </a>
                            </td>
                            <td className="py-3 pr-4">
                              <Badge
                                className={
                                  VALIDATION_STATUSES.find((s) => s.value === idea.validation_status)
                                    ?.color || "bg-gray-500"
                                }
                              >
                                {VALIDATION_STATUSES.find((s) => s.value === idea.validation_status)
                                  ?.label || idea.validation_status}
                              </Badge>
                            </td>
                            <td className="py-3 text-xs text-muted-foreground">
                              {new Date(idea.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Detail Panel / Modal */}
      {selectedIdea && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleStar(selectedIdea.id, selectedIdea.starred)}>
                  {selectedIdea.starred ? "⭐" : "☆"}
                </button>
                <h2 className="font-bold text-lg">{selectedIdea.title}</h2>
                {getPainBadge(selectedIdea.pain_score)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => archiveIdea(selectedIdea.id)}
                >
                  Archive
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIdea(null)}>
                  ✕
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span>{" "}
                  {getCategoryEmoji(selectedIdea.category)} {selectedIdea.category}
                </div>
                <div>
                  <span className="text-muted-foreground">Source:</span>{" "}
                  <a
                    href={selectedIdea.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    r/{selectedIdea.subreddit}
                  </a>
                </div>
                <div>
                  <span className="text-muted-foreground">Found:</span>{" "}
                  {new Date(selectedIdea.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="text-muted-foreground">Pain Score:</span> {selectedIdea.pain_score}
                </div>
                {selectedIdea.author && (
                  <div>
                    <span className="text-muted-foreground">Author:</span>{" "}
                    u/{selectedIdea.author}
                  </div>
                )}
                {(selectedIdea.post_score > 0 || selectedIdea.num_comments > 0) && (
                  <div>
                    <span className="text-muted-foreground">Engagement:</span>{" "}
                    {selectedIdea.post_score > 0 && <span>{selectedIdea.post_score} upvotes</span>}
                    {selectedIdea.post_score > 0 && selectedIdea.num_comments > 0 && " · "}
                    {selectedIdea.num_comments > 0 && <span>{selectedIdea.num_comments} comments</span>}
                  </div>
                )}
              </div>

              {/* Post URL */}
              {selectedIdea.url && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Post URL</label>
                  <a
                    href={selectedIdea.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block p-3 bg-muted rounded-md text-sm text-blue-500 hover:underline truncate"
                  >
                    {selectedIdea.url}
                  </a>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1 p-3 bg-muted rounded-md text-sm">{selectedIdea.description || "No description"}</p>
              </div>

              {/* Validation Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">📋 Validation & Analysis</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/saas-ideas/analyze", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ idea: selectedIdea }),
                        });
                        const data = await res.json();
                        if (data.success && data.analysis) {
                          updateIdea(selectedIdea.id, {
                            demand_volume: data.analysis.demand_volume,
                            expected_price: data.analysis.expected_price,
                            expected_revenue: data.analysis.expected_revenue,
                            key_insight: data.analysis.key_insight,
                            competitors: data.analysis.competitors,
                            differentiator: data.analysis.differentiator,
                            validation_status: "researching",
                          });
                        }
                      } catch (err) {
                        console.error("Failed to analyze:", err);
                      }
                    }}
                  >
                    🤖 Auto-Fill with AI
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Validation Status */}
                  <div>
                    <label className="text-sm text-muted-foreground">Validation Status</label>
                    <select
                      value={selectedIdea.validation_status}
                      onChange={(e) =>
                        updateIdea(selectedIdea.id, { validation_status: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background"
                    >
                      {VALIDATION_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Demand Volume */}
                  <div>
                    <label className="text-sm text-muted-foreground">Demand Volume</label>
                    <input
                      type="text"
                      placeholder="e.g., High, 10K searches/mo"
                      value={selectedIdea.demand_volume || ""}
                      onChange={(e) =>
                        updateIdea(selectedIdea.id, { demand_volume: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background"
                    />
                  </div>

                  {/* Expected Price */}
                  <div>
                    <label className="text-sm text-muted-foreground">Expected Price</label>
                    <input
                      type="text"
                      placeholder="e.g., $29/mo, $99/mo"
                      value={selectedIdea.expected_price || ""}
                      onChange={(e) =>
                        updateIdea(selectedIdea.id, { expected_price: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background"
                    />
                  </div>

                  {/* Expected Revenue */}
                  <div>
                    <label className="text-sm text-muted-foreground">Expected Revenue</label>
                    <input
                      type="text"
                      placeholder="e.g., $10K MRR potential"
                      value={selectedIdea.expected_revenue || ""}
                      onChange={(e) =>
                        updateIdea(selectedIdea.id, { expected_revenue: e.target.value })
                      }
                      className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background"
                    />
                  </div>
                </div>

                {/* Key Insight */}
                <div className="mt-4">
                  <label className="text-sm text-muted-foreground">Key Insight</label>
                  <textarea
                    placeholder="What's the core insight or opportunity here?"
                    value={selectedIdea.key_insight || ""}
                    onChange={(e) => updateIdea(selectedIdea.id, { key_insight: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background h-20"
                  />
                </div>

                {/* Competitors */}
                <div className="mt-4">
                  <label className="text-sm text-muted-foreground">Competitor Analysis</label>
                  <textarea
                    placeholder="List competitors and their weaknesses..."
                    value={selectedIdea.competitors || ""}
                    onChange={(e) => updateIdea(selectedIdea.id, { competitors: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background h-20"
                  />
                </div>

                {/* Differentiator */}
                <div className="mt-4">
                  <label className="text-sm text-muted-foreground">My Key Differentiator</label>
                  <textarea
                    placeholder="What would make your solution win?"
                    value={selectedIdea.differentiator || ""}
                    onChange={(e) =>
                      updateIdea(selectedIdea.id, { differentiator: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background h-20"
                  />
                </div>

                {/* Validation Notes */}
                <div className="mt-4">
                  <label className="text-sm text-muted-foreground">Validation Notes</label>
                  <textarea
                    placeholder="Notes on validation process, experiments tried, etc."
                    value={selectedIdea.validation_notes || ""}
                    onChange={(e) =>
                      updateIdea(selectedIdea.id, { validation_notes: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background h-24"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
