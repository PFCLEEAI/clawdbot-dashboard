"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Topic {
  id: string;
  name: string;
  status: "active" | "paused" | "completed";
  progress?: number;
  tasks?: {
    total: number;
    done: number;
  };
  lastUpdated?: string;
}

interface TopicsWidgetProps {
  topics: Topic[];
  onAddTopic?: () => void;
}

const statusColors = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  completed: "bg-blue-500",
};

const statusLabels = {
  active: "Active",
  paused: "Paused",
  completed: "Done",
};

export function TopicsWidget({ topics, onAddTopic }: TopicsWidgetProps) {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            📋 Topics & Projects
          </CardTitle>
          {onAddTopic && (
            <Button variant="outline" size="sm" onClick={onAddTopic}>
              + Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-2xl mb-2">📁</p>
            <p className="text-sm">No active topics</p>
            <p className="text-xs mt-1">Topics are loaded from TODO.md</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${statusColors[topic.status]}`}
                    />
                    <span className="font-medium text-sm">{topic.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {statusLabels[topic.status]}
                  </Badge>
                </div>

                {topic.tasks && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>
                        {topic.tasks.done}/{topic.tasks.total} tasks
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${(topic.tasks.done / topic.tasks.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {topic.lastUpdated && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {topic.lastUpdated}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
