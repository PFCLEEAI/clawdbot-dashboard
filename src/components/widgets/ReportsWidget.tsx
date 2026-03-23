"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProfileSummary {
  profile: string;
  totalActivities: number;
  postedCount: number;
  lastActivityDate: string | null;
  lastActivitySubreddit: string | null;
}

interface ActivityEntry {
  date: string;
  time: string;
  profile: string;
  platform: string;
  type: string;
  subreddit: string;
  postTitle: string;
  postUrl: string;
  commentText: string;
  status: string;
}

interface PainPoint {
  title: string;
  url: string;
  source: "reddit" | "x";
  content?: string;
}

interface ScanOpportunity {
  title: string;
  url: string;
  subreddit: string;
  persona: string;
}

interface ReportData {
  profileSummaries: ProfileSummary[];
  activities: ActivityEntry[];
  totalActivities: number;
  sonicribe: { todayCount: number; limit: number };
  xPainPoints: PainPoint[];
  redditOpportunities: ScanOpportunity[];
  lastScanAt: string | null;
}

const statusBadge: Record<string, string> = {
  posted: "bg-green-600",
  planned: "bg-blue-500",
  pending: "bg-yellow-500",
  failed: "bg-red-500",
};

export function ReportsWidget() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"activity" | "profiles" | "painpoints" | "opportunities">("activity");
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d: ReportData) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground text-sm py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const activeProfiles = data?.profileSummaries?.filter((p) => p.totalActivities > 0) || [];
  const dormantProfiles = data?.profileSummaries?.filter((p) => p.totalActivities === 0) || [];

  // Get activities for a specific profile
  const getProfileActivities = (profile: string) =>
    (data?.activities || []).filter((a) => a.profile.includes(profile));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Reports</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {data?.totalActivities || 0} total actions
            </Badge>
          </div>
        </div>
        {/* Tab buttons */}
        <div className="flex gap-1 mt-2 flex-wrap">
          <button
            onClick={() => setTab("activity")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              tab === "activity" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
            }`}
          >
            Activity Feed
          </button>
          <button
            onClick={() => setTab("profiles")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              tab === "profiles" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
            }`}
          >
            By Profile
          </button>
          <button
            onClick={() => setTab("painpoints")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              tab === "painpoints" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
            }`}
          >
            X Pain Points
          </button>
          <button
            onClick={() => setTab("opportunities")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              tab === "opportunities" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
            }`}
          >
            Sonicribe Opps
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Sonicribe daily counter - always visible */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
          <span className="text-xs font-medium">Sonicribe mentions today</span>
          <Badge variant={data?.sonicribe.todayCount === 0 ? "outline" : "default"} className="text-xs">
            {data?.sonicribe.todayCount ?? 0} / {data?.sonicribe.limit ?? 1}
          </Badge>
        </div>

        {/* Tab: Activity Feed */}
        {tab === "activity" && (
          <div className="space-y-1">
            {(data?.activities || []).length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-4">
                No engagement activity recorded yet.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1">
                {data?.activities.map((a, i) => (
                  <div key={i}>
                    <button
                      onClick={() => setExpandedActivity(expandedActivity === i ? null : i)}
                      className="w-full text-left p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge className={`text-[9px] px-1 shrink-0 ${statusBadge[a.status] || "bg-gray-500"}`}>
                            {a.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground shrink-0">{a.date}</span>
                          <span className="text-xs truncate">{a.postTitle || a.subreddit || "Comment"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {a.subreddit && (
                            <span className="text-[10px] text-orange-500">r/{a.subreddit}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground font-mono">{a.profile}</span>
                        {a.time && <span className="text-[10px] text-muted-foreground">{a.time}</span>}
                      </div>
                    </button>
                    {/* Expanded detail */}
                    {expandedActivity === i && (
                      <div className="mx-2 p-2 bg-muted/10 border-l-2 border-primary/30 rounded-r text-xs space-y-1.5">
                        {a.postTitle && (
                          <div>
                            <span className="text-muted-foreground">Post: </span>
                            {a.postUrl ? (
                              <a href={a.postUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                {a.postTitle}
                              </a>
                            ) : a.postTitle}
                          </div>
                        )}
                        {a.commentText && (
                          <div>
                            <span className="text-muted-foreground">Comment: </span>
                            <p className="mt-0.5 text-[11px] text-foreground/80 whitespace-pre-wrap line-clamp-6">
                              {a.commentText}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-3 text-[10px] text-muted-foreground pt-1">
                          <span>Type: {a.type}</span>
                          <span>Platform: {a.platform}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: By Profile */}
        {tab === "profiles" && (
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">
              Active: {activeProfiles.length} / {(data?.profileSummaries || []).length} profiles
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {activeProfiles.map((p) => (
                <div key={p.profile}>
                  <button
                    onClick={() => setExpandedProfile(expandedProfile === p.profile ? null : p.profile)}
                    className="w-full text-left p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs font-mono">{p.profile}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {p.totalActivities} actions
                        </Badge>
                        {p.lastActivityDate && (
                          <span className="text-[10px] text-muted-foreground">
                            last: {p.lastActivityDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  {/* Expanded: show profile's recent activities */}
                  {expandedProfile === p.profile && (
                    <div className="ml-4 border-l-2 border-primary/20 space-y-1 py-1">
                      {getProfileActivities(p.profile).slice(0, 10).map((a, i) => (
                        <div key={i} className="pl-3 py-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[9px] px-1 ${statusBadge[a.status] || "bg-gray-500"}`}>
                              {a.status}
                            </Badge>
                            <span className="text-muted-foreground">{a.date}</span>
                            {a.time && <span className="text-muted-foreground">{a.time}</span>}
                            {a.subreddit && <span className="text-orange-500">r/{a.subreddit}</span>}
                          </div>
                          {a.postTitle && (
                            <div className="mt-0.5">
                              {a.postUrl ? (
                                <a href={a.postUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-[11px]">
                                  {a.postTitle}
                                </a>
                              ) : (
                                <span className="text-[11px]">{a.postTitle}</span>
                              )}
                            </div>
                          )}
                          {a.commentText && (
                            <p className="text-[10px] text-foreground/60 mt-0.5 line-clamp-2">
                              {a.commentText}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {dormantProfiles.length > 0 && (
                <div className="pt-2">
                  <div className="text-[10px] text-muted-foreground mb-1">
                    Dormant ({dormantProfiles.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dormantProfiles.map((p) => (
                      <span key={p.profile} className="text-[10px] text-muted-foreground/60 font-mono bg-muted/20 px-1.5 py-0.5 rounded">
                        {p.profile}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: X Pain Points */}
        {tab === "painpoints" && (
          <div className="space-y-2">
            {(data?.xPainPoints || []).length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-4">
                No X pain points found yet. Next scan at 6AM/6PM.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {data?.xPainPoints.map((pp, i) => (
                  <a
                    key={i}
                    href={pp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[9px] px-1 mt-0.5 shrink-0">X</Badge>
                      <div className="min-w-0">
                        <p className="text-xs font-medium line-clamp-2">{pp.title}</p>
                        {pp.content && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                            {pp.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Sonicribe Opportunities */}
        {tab === "opportunities" && (
          <div className="space-y-2">
            {(data?.redditOpportunities || []).length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-4">
                No scan results yet. Next scan at 8AM.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {data?.redditOpportunities.map((opp, i) => (
                  <a
                    key={i}
                    href={opp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-xs font-medium line-clamp-2">{opp.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-muted-foreground">r/{opp.subreddit}</span>
                      <Badge variant="outline" className="text-[9px] px-1">{opp.persona}</Badge>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
