"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  isAllDay?: boolean;
}

interface CalendarWidgetProps {
  events: CalendarEvent[];
}

export function CalendarWidget({ events }: CalendarWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          📅 Today&apos;s Agenda
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-sm">Clear schedule!</p>
            <p className="text-xs">No events today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <span className="text-xs text-muted-foreground w-16 shrink-0">
                  {event.isAllDay ? "All day" : event.time}
                </span>
                <span className="text-sm">{event.title}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
