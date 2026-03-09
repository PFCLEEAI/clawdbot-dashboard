"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SaasIdea {
  id: number;
  title: string;
  pain_score: number;
  category: string;
  subreddit: string;
  starred: number;
  expected_revenue?: string;
  expected_price?: string;
  validation_status?: string;
  demand_volume?: string;
}

interface Stats {
  total_ideas: number;
  new_ideas: number;
  starred_ideas: number;
}

const validationColors: Record<string, string> = {
  validated: "bg-green-500/20 text-green-500",
  "needs-validation": "bg-amber-500/20 text-amber-500",
  rejected: "bg-red-500/20 text-red-500",
  not_started: "bg-muted text-muted-foreground",
};

export function SaasIdeasWidget() {
  const [ideas, setIdeas] = useState<SaasIdea[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ideasRes, statsRes] = await Promise.all([
          fetch("/api/saas-ideas?limit=5&starred=true"),
          fetch("/api/saas-ideas?action=stats"),
        ]);

        const ideasData = await ideasRes.json();
        const statsData = await statsRes.json();

        if (ideasData.ideas?.length === 0) {
          const topRes = await fetch("/api/saas-ideas?limit=5");
          const topData = await topRes.json();
          setIdeas(topData.ideas || []);
        } else {
          setIdeas(ideasData.ideas || []);
        }
        setStats(statsData);
      } catch (error) {
        console.error("Failed to fetch SaaS ideas:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const analyzeIdea = useCallback(async (id: number) => {
    setAnalyzing(id);
    try {
      await fetch("/api/saas-ideas/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      // Refresh ideas after analysis
      const res = await fetch("/api/saas-ideas?limit=5&starred=true");
      const data = await res.json();
      if (data.ideas?.length > 0) {
        setIdeas(data.ideas);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzing(null);
    }
  }, []);

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      automation: "🤖",
      crm_sales: "📈",
      content: "📝",
      data_management: "📊",
      billing_payments: "💳",
      project_management: "📋",
    };
    return emojis[category] || "💡";
  };

  if (loading) {
    return (
      <Card className="col-span-full lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">💡 SaaS Ideas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground text-sm py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">💡 SaaS Ideas</CardTitle>
          <Link href="/saas-ideas">
            <Button variant="ghost" size="sm" className="text-xs h-7">
              View All →
            </Button>
          </Link>
        </div>
        {stats && (
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span>{stats.total_ideas} total</span>
            <span>•</span>
            <span>{stats.new_ideas} new</span>
            <span>•</span>
            <span>⭐ {stats.starred_ideas}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {ideas.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            No ideas yet. Scanner runs overnight.
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">{idea.starred ? "⭐" : getCategoryEmoji(idea.category)}</span>
                  <div className="flex-1 min-w-0">
                    <Link href="/saas-ideas" className="text-sm font-medium hover:underline line-clamp-1">
                      {idea.title}
                    </Link>

                    {/* Badges Row */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={
                          idea.pain_score >= 8
                            ? "bg-red-500/20 text-red-500 text-[10px]"
                            : idea.pain_score >= 5
                            ? "bg-orange-500/20 text-orange-500 text-[10px]"
                            : "text-[10px]"
                        }
                      >
                        Pain: {idea.pain_score}
                      </Badge>

                      {/* Validation Status */}
                      {idea.validation_status && idea.validation_status !== "not_started" && (
                        <Badge className={`text-[10px] ${validationColors[idea.validation_status] || ""}`}>
                          {idea.validation_status.replace(/_/g, " ")}
                        </Badge>
                      )}

                      {/* Target Market */}
                      {idea.subreddit && (
                        <span className="text-[10px] text-muted-foreground">r/{idea.subreddit}</span>
                      )}
                    </div>

                    {/* Business Model Row */}
                    {(idea.expected_revenue || idea.expected_price) && (
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                        {idea.expected_price && <span>💰 {idea.expected_price}</span>}
                        {idea.expected_revenue && <span>📈 {idea.expected_revenue}</span>}
                        {idea.demand_volume && <span>📊 {idea.demand_volume}</span>}
                      </div>
                    )}

                    {/* Analyze Button */}
                    {(!idea.validation_status || idea.validation_status === "not_started") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-5 px-1.5 mt-1"
                        disabled={analyzing === idea.id}
                        onClick={(e) => {
                          e.preventDefault();
                          analyzeIdea(idea.id);
                        }}
                      >
                        {analyzing === idea.id ? "Analyzing..." : "🔍 Analyze"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
