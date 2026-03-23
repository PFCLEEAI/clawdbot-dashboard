"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemoryGraph } from "@/components/memory/MemoryGraph";

interface MemorySummary {
  today: string;
  hasTodayMemo: boolean;
  todayExcerpt: string;
  totalNotes: number;
  typeCounts: Record<string, number>;
  recentNotes: { slug: string; title: string; type: string; date?: string; updated?: string }[];
  graphStats: {
    totalNotes: number;
    totalEdges: number;
    orphanCount: number;
    phantomCount: number;
    bridgeNotes: string[];
  };
}

interface GraphData {
  nodes: { id: string; label: string; type: string; exists: boolean; linkCount: number; group: string }[];
  edges: { source: string; target: string }[];
  stats: {
    totalNotes: number;
    totalEdges: number;
    orphanCount: number;
    phantomCount: number;
    bridgeNotes: string[];
  };
}

export function MemoryWidget() {
  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/memory").then((r) => r.json()).catch(() => null),
      fetch("/api/memory?action=graph").then((r) => r.json()).catch(() => null),
    ]).then(([sum, g]) => {
      setSummary(sum);
      setGraph(g);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            🧠 Memory Vault
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            🧠 Memory Vault
          </CardTitle>
          <Link href="/memory">
            <Button variant="ghost" size="sm" className="text-xs">
              Open →
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Today's memo status */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`w-2 h-2 rounded-full ${
              summary?.hasTodayMemo ? "bg-green-500" : "bg-yellow-500"
            }`}
          />
          <span className="text-xs">
            {summary?.hasTodayMemo ? "Today's memo exists" : "No memo today"}
          </span>
        </div>

        {/* Mini graph */}
        {graph && graph.nodes.length > 0 && (
          <div className="mb-3 -mx-2">
            <MemoryGraph graph={graph} mini />
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-lg font-semibold">{summary?.totalNotes || 0}</div>
            <div className="text-xs text-muted-foreground">Notes</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-lg font-semibold">{summary?.graphStats?.totalEdges || 0}</div>
            <div className="text-xs text-muted-foreground">Links</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-lg font-semibold">{summary?.graphStats?.phantomCount || 0}</div>
            <div className="text-xs text-muted-foreground">Phantoms</div>
          </div>
        </div>

        {/* Recent notes */}
        {summary?.recentNotes && summary.recentNotes.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Recent</p>
            <div className="space-y-1">
              {summary.recentNotes.slice(0, 3).map((n) => (
                <Link
                  key={n.slug}
                  href={`/memory?note=${n.slug}`}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 text-xs transition-colors"
                >
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {n.type}
                  </Badge>
                  <span className="truncate">{n.title}</span>
                  {n.date && (
                    <span className="text-muted-foreground ml-auto text-[10px]">{n.date}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
