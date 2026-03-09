import { NextResponse } from "next/server";
import { getSNSStats } from "@/lib/clawdbot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getSNSStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch SNS stats" },
      { status: 500 }
    );
  }
}
