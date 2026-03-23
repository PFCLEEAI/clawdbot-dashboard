"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SNSStats {
  today: { posts: number; comments: number; scraped: number };
  pendingDrafts: number;
  weeklyTrend: {
    date: string;
    posts: number;
    comments: number;
    scraped: number;
  }[];
  recentComments: {
    platform: string;
    targetUrl: string;
    commentText: string;
    postedAt: string;
  }[];
}

function truncateUrl(url: string, maxLen: number): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    return path.length > maxLen ? path.slice(0, maxLen) + "..." : path;
  } catch {
    // If targetUrl is not a valid URL, just truncate the raw string
    return url.length > maxLen ? url.slice(0, maxLen) + "..." : url;
  }
}

export function SNSEngagementWidget() {
  const [stats, setStats] = useState<SNSStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sns")
      .then((r) => r.json())
      .then((data: SNSStats) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="col-span-full lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            SNS Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground text-sm py-4">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(
    ...(stats?.weeklyTrend || []).map(
      (d) => d.posts + d.comments + d.scraped
    ),
    1
  );

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            SNS Engagement
          </CardTitle>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[10px] px-1">
              X
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1">
              Reddit
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1">
              IG
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1">
              YT
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stat Cards Row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold">{stats?.today.posts ?? 0}</div>
            <div className="text-[10px] text-muted-foreground">Posts</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold">
              {stats?.today.comments ?? 0}
            </div>
            <div className="text-[10px] text-muted-foreground">Comments</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold">
              {stats?.today.scraped ?? 0}
            </div>
            <div className="text-[10px] text-muted-foreground">Scraped</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold">
              {stats?.pendingDrafts ?? 0}
            </div>
            <div className="text-[10px] text-muted-foreground">Drafts</div>
          </div>
        </div>

        {/* 7-Day Trend Bars */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            7-Day Activity
          </div>
          <div className="flex items-end gap-1 h-16">
            {(stats?.weeklyTrend || []).map((day, i) => {
              const total = day.posts + day.comments + day.scraped;
              const height =
                maxValue > 0 ? (total / maxValue) * 100 : 0;
              const dayLabel = new Date(day.date)
                .toLocaleDateString("en", { weekday: "short" })
                .charAt(0);
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-primary/60 rounded-sm transition-all min-h-[2px]"
                    style={{ height: `${Math.max(height, 3)}%` }}
                    title={`${day.date}: ${total} total`}
                  />
                  <span className="text-[9px] text-muted-foreground">
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Comments */}
        {/* Calendar Link */}
        <Link href="/sns-calendar">
          <Button variant="outline" size="sm" className="w-full text-xs">
            View Full Calendar →
          </Button>
        </Link>

        {stats?.recentComments && stats.recentComments.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Recent Comments
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {stats.recentComments.slice(0, 5).map((comment, i) => (
                <div key={i} className="text-xs p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-1 mb-1">
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1"
                    >
                      {comment.platform}
                    </Badge>
                    <span className="text-muted-foreground truncate">
                      {comment.targetUrl
                        ? truncateUrl(comment.targetUrl, 30)
                        : ""}
                    </span>
                  </div>
                  <p className="text-foreground/80 line-clamp-2">
                    {comment.commentText}
                  </p>
                  <span className="text-[9px] text-muted-foreground">
                    {comment.postedAt
                      ? new Date(comment.postedAt).toLocaleString()
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
