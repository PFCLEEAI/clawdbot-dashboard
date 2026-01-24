import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { text, type } = await request.json();

    if (!text || !type) {
      return NextResponse.json(
        { error: "Missing text or type" },
        { status: 400 }
      );
    }

    const now = new Date();
    const timestamp = now.toISOString();
    const dateStr = now.toISOString().split("T")[0];

    // Save to appropriate location based on type
    if (type === "task") {
      // Add to Apple Reminders via remindctl
      try {
        const escaped = text.replace(/"/g, '\\"');
        execSync(`remindctl add "Inbox" "${escaped}"`, {
          encoding: "utf-8",
          timeout: 10000,
        });
      } catch {
        // Fallback: save to TODO capture file
        const capturePath = join(homedir(), "clawd/captures/tasks.md");
        ensureDir(dirname(capturePath));
        appendFileSync(capturePath, `- [ ] ${text} (${timestamp})\n`);
      }
    } else if (type === "note") {
      // Add to Apple Notes via memo CLI or save to file
      try {
        const escaped = text.replace(/"/g, '\\"');
        execSync(`memo add "Quick Captures" "${escaped}"`, {
          encoding: "utf-8",
          timeout: 10000,
        });
      } catch {
        // Fallback: save to notes file
        const notesPath = join(homedir(), `clawd/captures/notes-${dateStr}.md`);
        ensureDir(dirname(notesPath));
        appendFileSync(notesPath, `## ${timestamp}\n\n${text}\n\n---\n\n`);
      }
    } else if (type === "idea") {
      // Save ideas to a dedicated file
      const ideasPath = join(homedir(), "clawd/captures/ideas.md");
      ensureDir(dirname(ideasPath));
      appendFileSync(ideasPath, `- 💡 ${text} (${timestamp})\n`);
    }

    return NextResponse.json({ success: true, timestamp });
  } catch (error) {
    console.error("Capture error:", error);
    return NextResponse.json(
      { error: "Failed to capture" },
      { status: 500 }
    );
  }
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
