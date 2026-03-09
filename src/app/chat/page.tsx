"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const [isLocalhost, setIsLocalhost] = useState(true);
  const [mounted, setMounted] = useState(false);

  const gatewayUrl = "http://127.0.0.1:18789/chat?session=agent%3Amain%3Amain";

  useEffect(() => {
    setMounted(true);
    // Check if we're running on localhost or Vercel
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    setIsLocalhost(isLocal);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl animate-bounce inline-block">🦞</span>
          <p className="mt-4 text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <span>←</span>
                <span>Back</span>
              </Button>
            </Link>
            <span className="text-2xl">🦞</span>
            <h1 className="text-xl font-semibold">Clawdbot Chat</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isLocalhost ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Connected to local gateway
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                Remote access
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {isLocalhost ? (
          <iframe
            src={gatewayUrl}
            className="flex-1 w-full border-0"
            title="Clawdbot Chat"
            allow="clipboard-write"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <span className="text-6xl mb-6 block">🔒</span>
              <h2 className="text-2xl font-semibold mb-4">Local Network Required</h2>
              <p className="text-muted-foreground mb-6">
                Chat is available when connected to your local network.
                The chat interface connects to your local Clawdbot gateway.
              </p>
              <div className="bg-muted rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-2">Gateway URL:</p>
                <code className="text-sm font-mono text-foreground break-all">
                  http://127.0.0.1:18789/chat
                </code>
              </div>
              <Link href="/">
                <Button variant="outline">
                  ← Return to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
