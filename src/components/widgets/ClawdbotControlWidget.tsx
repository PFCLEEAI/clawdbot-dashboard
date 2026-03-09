"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Tab = "cron" | "agents" | "chat";

interface CronRun {
  jobName: string;
  status: "ok" | "error";
  startedAt: string;
  duration?: number;
  error?: string;
}

interface CronJob {
  id?: string;
  name: string;
  enabled?: boolean;
}

interface GatewayChannel {
  name: string;
  status: string;
}

interface GatewayStatus {
  running: boolean;
  channels?: GatewayChannel[];
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export function ClawdbotControlWidget() {
  const [activeTab, setActiveTab] = useState<Tab>("cron");

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Clawdbot Control
          </CardTitle>
          <div className="flex gap-1">
            {(["cron", "agents", "chat"] as Tab[]).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "ghost"}
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setActiveTab(tab)}
              >
                {tab === "cron"
                  ? "Cron"
                  : tab === "agents"
                    ? "Agents"
                    : "Chat"}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === "cron" && <CronControlTab />}
        {activeTab === "agents" && <AgentControlTab />}
        {activeTab === "chat" && <ChatTab />}
      </CardContent>
    </Card>
  );
}

function CronControlTab() {
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [triggering, setTriggering] = useState<string | null>(null);

  useEffect(() => {
    // Fetch cron logs
    fetch("/api/cron/logs")
      .then((r) => r.json())
      .then((data: { runs?: CronRun[] }) => setRuns(data.runs || []))
      .catch(console.error);

    // Fetch job list from dashboard data
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data: { cron?: CronJob[] }) =>
        setJobs((data.cron || []).filter((j) => j.enabled))
      )
      .catch(console.error);
  }, []);

  const triggerJob = useCallback(async (jobName: string) => {
    setTriggering(jobName);
    try {
      const res = await fetch("/api/cron/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobName }),
      });
      const data = (await res.json()) as { success?: boolean };
      if (data.success) {
        // Refresh runs
        const logsRes = await fetch("/api/cron/logs");
        const logsData = (await logsRes.json()) as { runs?: CronRun[] };
        setRuns(logsData.runs || []);
      }
    } catch (err) {
      console.error("Failed to trigger job:", err);
    } finally {
      setTriggering(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Job list with Run buttons */}
      <div className="space-y-2">
        {jobs.map((job) => (
          <div
            key={job.id || job.name}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
          >
            <div className="text-sm font-medium">{job.name}</div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-6"
              disabled={triggering === job.name}
              onClick={() => triggerJob(job.name)}
            >
              {triggering === job.name ? "Running..." : "Run Now"}
            </Button>
          </div>
        ))}
      </div>

      {/* Recent runs log */}
      <div>
        <div className="text-xs text-muted-foreground mb-2">Recent Runs</div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {runs.slice(0, 10).map((run, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/20"
            >
              <div className="flex items-center gap-2">
                <span>{run.status === "ok" ? "+" : "x"}</span>
                <span className="font-medium">{run.jobName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {run.duration != null && (
                  <span>{(run.duration / 1000).toFixed(1)}s</span>
                )}
                <span>
                  {run.startedAt
                    ? new Date(run.startedAt).toLocaleTimeString()
                    : ""}
                </span>
              </div>
            </div>
          ))}
          {runs.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              No recent runs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentControlTab() {
  const [status, setStatus] = useState<GatewayStatus | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data: { gateway?: GatewayStatus }) =>
        setStatus(data.gateway ?? null)
      )
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status?.running
                ? "bg-green-500 animate-pulse"
                : "bg-red-500"
            }`}
          />
          <span className="text-sm font-medium">Gateway</span>
        </div>
        <Badge variant={status?.running ? "default" : "destructive"}>
          {status?.running ? "Running" : "Stopped"}
        </Badge>
      </div>

      {status?.channels?.map((ch) => (
        <div
          key={ch.name}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/20"
        >
          <span className="text-sm capitalize">{ch.name}</span>
          <Badge
            variant={ch.status === "connected" ? "default" : "outline"}
            className="text-xs"
          >
            {ch.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;

    const userMsg: ChatMessage = {
      role: "user",
      text: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/clawdbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = (await res.json()) as { response?: string };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.response || "No response",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Error: Failed to get response",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  return (
    <div className="space-y-3">
      {/* Message area */}
      <div className="h-48 overflow-y-auto space-y-2 p-2 rounded-lg bg-muted/20">
        {messages.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8">
            Ask Clawdbot anything...
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm p-2 rounded-lg ${
              msg.role === "user"
                ? "bg-primary/10 ml-8"
                : "bg-muted/50 mr-8"
            }`}
          >
            <div className="text-[10px] text-muted-foreground mb-0.5">
              {msg.role === "user" ? "You" : "Clawdbot"}
            </div>
            <div className="whitespace-pre-wrap">{msg.text}</div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Ask clawdbot..."
          className="flex-1 text-sm px-3 py-1.5 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={sending}
        />
        <Button
          size="sm"
          onClick={sendMessage}
          disabled={sending || !input.trim()}
        >
          {sending ? "..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
