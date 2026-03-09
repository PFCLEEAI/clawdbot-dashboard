import { NextResponse } from "next/server";
import { getCronRuns } from "@/lib/clawdbot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const runs = await getCronRuns(20);
    return NextResponse.json({ runs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch cron logs" }, { status: 500 });
  }
}
