"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SNSActivity {
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

interface CalendarDay {
  date: string;
  totalActivities: number;
  posts: number;
  comments: number;
  platforms: string[];
}

const platformIcon: Record<string, string> = {
  reddit: "Reddit",
  x: "X",
  unknown: "?",
};

const typeLabels: Record<string, string> = {
  post: "Post",
  comment: "Comment",
  reply: "Reply",
  upvote: "Upvote",
  scrape: "Scraped",
  penetration: "Penetration",
};

const statusColors: Record<string, string> = {
  posted: "bg-green-500",
  failed: "bg-red-500",
  pending: "bg-yellow-500",
  draft: "bg-gray-500",
  scheduled: "bg-blue-500",
};

export default function SNSCalendarPage() {
  const [activities, setActivities] = useState<SNSActivity[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<SNSActivity | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Fetch calendar overview for current month
  const fetchCalendar = useCallback(async () => {
    const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
    const res = await fetch(`/api/sns-calendar?action=calendar&month=${monthStr}`);
    const data = await res.json();
    setCalendarDays(data.days || []);
  }, [currentMonth]);

  // Fetch activities for selected date
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/sns-calendar?date=${selectedDate}`);
    const data = await res.json();
    setActivities(data.activities || []);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Filter activities
  const filteredActivities = activities.filter((a) => {
    if (filterPlatform !== "all" && a.platform !== filterPlatform) return false;
    if (filterType !== "all" && a.type !== filterType) return false;
    return true;
  });

  // Calendar day counts map
  const dayCountMap = new Map(calendarDays.map((d) => [d.date, d]));

  // Stats for selected date
  const dateStats = {
    total: filteredActivities.length,
    posts: filteredActivities.filter((a) => a.type === "post").length,
    comments: filteredActivities.filter(
      (a) => a.type === "comment" || a.type === "reply"
    ).length,
    penetration: filteredActivities.filter((a) => a.type === "penetration").length,
    reddit: filteredActivities.filter((a) => a.platform === "reddit").length,
    x: filteredActivities.filter((a) => a.platform === "x").length,
  };

  // Render calendar grid
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    const today = new Date().toISOString().split("T")[0];

    const cells = [];
    for (let i = 0; i < startingDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-12" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayData = dayCountMap.get(dateStr);
      const isSelected = selectedDate === dateStr;
      const isToday = dateStr === today;
      const hasActivity = dayData && dayData.totalActivities > 0;

      cells.push(
        <button
          key={day}
          onClick={() => setSelectedDate(dateStr)}
          className={`
            h-12 w-full rounded-lg text-sm relative flex flex-col items-center justify-center gap-0.5 transition-colors
            ${isSelected ? "bg-primary text-primary-foreground" : ""}
            ${isToday && !isSelected ? "border-2 border-primary" : ""}
            ${hasActivity && !isSelected ? "bg-muted hover:bg-muted/80" : "hover:bg-muted/50"}
          `}
        >
          <span className="font-medium">{day}</span>
          {hasActivity && (
            <div className="flex gap-0.5">
              {dayData!.platforms.includes("reddit") && (
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-orange-500"}`} />
              )}
              {dayData!.platforms.includes("x") && (
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-blue-500"}`} />
              )}
            </div>
          )}
          {hasActivity && (
            <span className={`absolute top-0.5 right-1 text-[9px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
              {dayData!.totalActivities}
            </span>
          )}
        </button>
      );
    }

    return cells;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground"
              >
                ← Dashboard
              </Link>
              <h1 className="text-2xl font-bold">SNS Content Calendar</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{activities.length} activities today</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Calendar */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Calendar</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() - 1
                          )
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
                          new Date(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() + 1
                          )
                        )
                      }
                    >
                      →
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={i}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span>Reddit activity</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>X / Twitter activity</span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t text-xs text-muted-foreground">
                  <span>Click a date to view details</span>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Platform
                  </label>
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background"
                  >
                    <option value="all">All Platforms</option>
                    <option value="reddit">Reddit</option>
                    <option value="x">X / Twitter</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background"
                  >
                    <option value="all">All Types</option>
                    <option value="post">Posts</option>
                    <option value="comment">Comments</option>
                    <option value="reply">Replies</option>
                    <option value="penetration">Penetration</option>
                    <option value="upvote">Upvotes</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Day Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Day Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <Badge variant="secondary">{dateStats.total}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posts</span>
                    <Badge variant="secondary">{dateStats.posts}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comments</span>
                    <Badge variant="secondary">{dateStats.comments}</Badge>
                  </div>
                  {dateStats.penetration > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Penetration</span>
                      <Badge variant="secondary">
                        {dateStats.penetration}
                      </Badge>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reddit</span>
                      <Badge variant="secondary">{dateStats.reddit}</Badge>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">X</span>
                      <Badge variant="secondary">{dateStats.x}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {formatDate(selectedDate)}
                    <span className="ml-2 text-muted-foreground font-normal">
                      ({filteredActivities.length} activities)
                    </span>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDate(
                          new Date().toISOString().split("T")[0]
                        );
                        setCurrentMonth(new Date());
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchActivities}
                    >
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading activities...
                  </div>
                ) : filteredActivities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg mb-2">No SNS activity on this date</p>
                    <p className="text-sm">
                      Activities will appear here once the SNS automation runs.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-3">Time</th>
                          <th className="pb-2 pr-3">Platform</th>
                          <th className="pb-2 pr-3">Type</th>
                          <th className="pb-2 pr-3">Profile</th>
                          <th className="pb-2 pr-3">Content</th>
                          <th className="pb-2 pr-3">Target</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActivities.map((activity) => (
                          <tr
                            key={activity.id}
                            className="border-b hover:bg-muted/50 cursor-pointer"
                            onClick={() => setSelectedActivity(activity)}
                          >
                            <td className="py-3 pr-3 text-muted-foreground whitespace-nowrap">
                              {activity.time || "--"}
                            </td>
                            <td className="py-3 pr-3">
                              <Badge
                                variant="outline"
                                className={
                                  activity.platform === "reddit"
                                    ? "border-orange-500 text-orange-600"
                                    : activity.platform === "x"
                                    ? "border-blue-500 text-blue-600"
                                    : ""
                                }
                              >
                                {platformIcon[activity.platform] || activity.platform}
                              </Badge>
                            </td>
                            <td className="py-3 pr-3">
                              <span className="text-xs">
                                {typeLabels[activity.type] || activity.type}
                              </span>
                            </td>
                            <td className="py-3 pr-3 text-xs text-muted-foreground max-w-[100px] truncate">
                              {activity.profile || "-"}
                            </td>
                            <td className="py-3 pr-3 max-w-xs">
                              <div className="truncate text-xs">
                                {activity.content || "-"}
                              </div>
                            </td>
                            <td className="py-3 pr-3">
                              {activity.subreddit ? (
                                <span className="text-xs text-orange-600">
                                  r/{activity.subreddit}
                                </span>
                              ) : activity.targetUrl ? (
                                <a
                                  href={activity.targetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-blue-500 hover:underline truncate block max-w-[120px]"
                                >
                                  Link
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3">
                              <Badge
                                className={
                                  statusColors[activity.status] || "bg-gray-500"
                                }
                              >
                                {activity.status}
                              </Badge>
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

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={
                    selectedActivity.platform === "reddit"
                      ? "border-orange-500 text-orange-600"
                      : "border-blue-500 text-blue-600"
                  }
                >
                  {platformIcon[selectedActivity.platform]}
                </Badge>
                <h2 className="font-bold">
                  {typeLabels[selectedActivity.type] || selectedActivity.type} Detail
                </h2>
                <Badge className={statusColors[selectedActivity.status]}>
                  {selectedActivity.status}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedActivity(null)}
              >
                X
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {selectedActivity.date}
                </div>
                <div>
                  <span className="text-muted-foreground">Time:</span>{" "}
                  {selectedActivity.time || "N/A"}
                </div>
                <div>
                  <span className="text-muted-foreground">Platform:</span>{" "}
                  {platformIcon[selectedActivity.platform]}
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  {typeLabels[selectedActivity.type]}
                </div>
                {selectedActivity.profile && (
                  <div>
                    <span className="text-muted-foreground">Profile:</span>{" "}
                    {selectedActivity.profile}
                  </div>
                )}
                {selectedActivity.subreddit && (
                  <div>
                    <span className="text-muted-foreground">Subreddit:</span>{" "}
                    r/{selectedActivity.subreddit}
                  </div>
                )}
              </div>

              {selectedActivity.content && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Content
                  </label>
                  <p className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {selectedActivity.content}
                  </p>
                </div>
              )}

              {selectedActivity.targetUrl && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Target URL
                  </label>
                  <a
                    href={selectedActivity.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block p-3 bg-muted rounded-md text-sm text-blue-500 hover:underline break-all"
                  >
                    {selectedActivity.targetUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
