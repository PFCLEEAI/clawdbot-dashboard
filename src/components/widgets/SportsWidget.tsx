"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Team {
  name: string;
  emoji: string;
  lastResult?: string;
  nextMatch?: {
    opponent: string;
    date: string;
    competition: string;
  };
}

interface SportsWidgetProps {
  teams: Team[];
}

export function SportsWidget({ teams }: SportsWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          ⚽ Sports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {teams.map((team, index) => (
            <div key={team.name}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span>{team.emoji}</span>
                  <span className="font-medium text-sm">{team.name}</span>
                </div>
                {team.lastResult && (
                  <p className="text-xs text-muted-foreground">
                    Last: {team.lastResult}
                  </p>
                )}
                {team.nextMatch && (
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-sm">
                      vs {team.nextMatch.opponent}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {team.nextMatch.date} · {team.nextMatch.competition}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
