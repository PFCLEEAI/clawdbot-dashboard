"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Tweet {
  id: string;
  author: string;
  handle: string;
  text: string;
  time: string;
  likes?: number;
}

interface TwitterWidgetProps {
  tweets: Tweet[];
  loading?: boolean;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

export function TwitterWidget({ tweets, loading }: TwitterWidgetProps) {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            🐦 Twitter Digest
          </CardTitle>
          {tweets.length > 0 && (
            <Badge variant="secondary">{tweets.length} tweets</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Loading tweets...</p>
          </div>
        ) : tweets.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-2xl mb-1">🐦</p>
            <p className="text-sm">No recent tweets</p>
            <p className="text-xs mt-1">Configure bird CLI for Twitter</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {tweets.map((tweet) => (
              <div
                key={tweet.id}
                className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{tweet.author}</span>
                  <span className="text-xs text-muted-foreground">
                    @{tweet.handle}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {timeAgo(tweet.time)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {tweet.text}
                </p>
                {tweet.likes !== undefined && tweet.likes > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    ❤️ {tweet.likes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
