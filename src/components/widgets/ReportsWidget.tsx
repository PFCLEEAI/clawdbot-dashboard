"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RedditEngagement {
  profile: string;
  totalPosted: number;
  lastPostedAt: string | null;
  todayCount: number;
}

interface SonicribeMention {
  todayCount: number;
  limit: number;
}

interface PainPoint {
  title: string;
  url: string;
  source: "reddit" | "x";
  content?: string;
  huntedAt?: string;
}

interface ScanOpportunity {
  title: string;
  url: string;
  subreddit: string;
  persona: string;
}

interface ReportData {
  engagement: RedditEngagement[];
  sonicribe: SonicribeMention;
  xPainPoints: PainPoint[];
  redditOpportunities: ScanOpportunity[];
  lastScanAt: string | null;
}

export function ReportsWidget() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"engagement" | "painpoints" | "opportunities">("engagement");

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

  const activeProfiles = data?.engagement?.filter((e) => e.totalPosted > 0) || [];
  const dormantProfiles = data?.engagement?.filter((e) => e.totalPosted === 0) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Reports</CardTitle>
          <div className="flex gap-1">
            {data?.lastScanAt && (
              <span className="text-[10px] text-muted-foreground">
                Scan: {new Date(data.lastScanAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        {/* Tab buttons */}
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => setTab("engagement")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              tab === "engagement" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
            }`}
          >
            Reddit Engagement
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

        {/* Tab: Reddit Engagement */}
        {tab === "engagement" && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Active: {activeProfiles.length} / {(data?.engagement || []).length} profiles
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {activeProfiles.map((e) => (
                <div key={e.profile} className="flex items-center justify-between p-2 rounded bg-muted/20 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="font-mono">{e.profile}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {e.totalPosted} posts
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      today: {e.todayCount}
                    </Badge>
                  </div>
                </div>
              ))}
              {dormantProfiles.length > 0 && (
                <div className="pt-1">
                  <div className="text-[10px] text-muted-foreground mb-1">Dormant</div>
                  {dormantProfiles.map((e) => (
                    <div key={e.profile} className="flex items-center gap-2 p-1.5 text-xs text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                      <span className="font-mono">{e.profile}</span>
                    </div>
                  ))}
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
                      <Badge variant="outline" className="text-[9px] px-1 mt-0.5 shrink-0">
                        {pp.source === "x" ? "X" : "Reddit"}
                      </Badge>
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium line-clamp-2">{opp.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-muted-foreground">r/{opp.subreddit}</span>
                          <Badge variant="outline" className="text-[9px] px-1">{opp.persona}</Badge>
                        </div>
                      </div>
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
