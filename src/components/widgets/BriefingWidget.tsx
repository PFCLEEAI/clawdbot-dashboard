"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

interface BriefingData {
  date: string;
  weather?: {
    temperature: string;
    condition: string;
    humidity: string;
    wind: string;
  };
  emailSummary?: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  calendarSummary?: {
    eventCount: number;
    nextMeeting?: string;
  };
  sports?: {
    team: string;
    lastResult?: string;
    nextMatch?: string;
  }[];
}

interface BriefingWidgetProps {
  briefing: BriefingData | null;
  onGenerate?: () => void;
  generating?: boolean;
}

export function BriefingWidget({ briefing, onGenerate, generating }: BriefingWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  if (!briefing) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              📰 Daily Briefing
            </CardTitle>
            {onGenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerate}
                disabled={generating}
              >
                {generating ? "Generating..." : "Generate Now"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-3xl mb-2">🦞</p>
            <p className="text-sm">No briefing yet today</p>
            <p className="text-xs mt-1">
              Briefing runs automatically at 5:15 AM
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            📰 Daily Briefing
            <Badge variant="outline">{briefing.date}</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Weather */}
          {briefing.weather && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl">{briefing.weather.condition}</p>
              <p className="text-lg font-bold">{briefing.weather.temperature}</p>
              <p className="text-xs text-muted-foreground">
                {briefing.weather.humidity} · {briefing.weather.wind}
              </p>
            </div>
          )}

          {/* Email summary */}
          {briefing.emailSummary && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl">📬</p>
              <p className="text-lg font-bold">{briefing.emailSummary.total}</p>
              <p className="text-xs text-muted-foreground">
                {briefing.emailSummary.high > 0 && `${briefing.emailSummary.high} priority`}
                {briefing.emailSummary.high === 0 && "emails"}
              </p>
            </div>
          )}

          {/* Calendar summary */}
          {briefing.calendarSummary && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl">📅</p>
              <p className="text-lg font-bold">
                {briefing.calendarSummary.eventCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {briefing.calendarSummary.eventCount === 0
                  ? "clear day"
                  : "events"}
              </p>
            </div>
          )}

          {/* Sports quick view */}
          {briefing.sports && briefing.sports.length > 0 && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl">⚽</p>
              <p className="text-lg font-bold">{briefing.sports.length}</p>
              <p className="text-xs text-muted-foreground">teams tracked</p>
            </div>
          )}
        </div>

        {expanded && briefing.sports && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Sports Updates
              </p>
              {briefing.sports.map((team) => (
                <div key={team.team} className="flex justify-between text-sm">
                  <span>{team.team}</span>
                  <span className="text-muted-foreground">
                    {team.nextMatch || team.lastResult}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
