"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Email {
  id: string;
  from: string;
  subject: string;
  priority: "high" | "medium" | "low";
}

interface EmailWidgetProps {
  emails: Email[];
  unreadCount: number;
}

const priorityColors = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
} as const;

export function EmailWidget({ emails, unreadCount }: EmailWidgetProps) {
  const highPriority = emails.filter((e) => e.priority === "high");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            📬 Mail
          </CardTitle>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} unread</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {unreadCount === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-2xl mb-1">📭</p>
            <p className="text-sm">Inbox zero!</p>
            <p className="text-xs">No unread emails</p>
          </div>
        ) : (
          <div className="space-y-2">
            {highPriority.length > 0 && (
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Priority
              </div>
            )}
            {emails.slice(0, 4).map((email) => (
              <div
                key={email.id}
                className="p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={priorityColors[email.priority]} className="text-xs">
                    {email.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">
                    {email.from}
                  </span>
                </div>
                <p className="text-sm truncate">{email.subject}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
