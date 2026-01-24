"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface NewspaperWidgetProps {
  imagePath: string | null;
  date: string;
  onGenerate?: () => void;
  generating?: boolean;
}

export function NewspaperWidget({
  imagePath,
  date,
  onGenerate,
  generating,
}: NewspaperWidgetProps) {
  const [showFullSize, setShowFullSize] = useState(false);

  if (!imagePath) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              📰 The Daily Clawd
            </CardTitle>
            {onGenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerate}
                disabled={generating}
              >
                {generating ? "Generating..." : "Generate"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
            <p className="text-3xl mb-2">🗞️</p>
            <p className="text-sm">No newspaper generated yet</p>
            <p className="text-xs mt-1">Click Generate to create today&apos;s edition</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              📰 The Daily Clawd
              <Badge variant="outline">{date}</Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullSize(true)}
            >
              View Full
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setShowFullSize(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePath}
              alt="The Daily Clawd"
              className="w-full rounded-lg border shadow-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Full-size modal */}
      {showFullSize && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowFullSize(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={() => setShowFullSize(false)}
            >
              ✕ Close
            </Button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePath}
              alt="The Daily Clawd - Full Size"
              className="w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
