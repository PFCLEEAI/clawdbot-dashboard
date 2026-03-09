import { NextResponse } from "next/server";
import { triggerCronJob } from "@/lib/clawdbot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { jobName } = await request.json();
    if (!jobName || typeof jobName !== "string") {
      return NextResponse.json({ error: "jobName is required" }, { status: 400 });
    }
    // Sanitize jobName - only allow alphanumeric, dashes, underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(jobName)) {
      return NextResponse.json({ error: "Invalid job name" }, { status: 400 });
    }
    const result = await triggerCronJob(jobName);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to trigger job" }, { status: 500 });
  }
}
