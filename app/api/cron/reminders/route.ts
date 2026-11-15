import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { optionalEnv } from "@/lib/env";
import { runReminders } from "@/lib/reminder-run";

export const maxDuration = 60;

function authorised(request: Request): boolean {
  const secret = optionalEnv("CRON_SECRET");
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

/**
 * Called every 10 minutes by Supabase pg_cron (see supabase/cron.sql).
 * Sends any reminder emails that are due. Requires `Bearer CRON_SECRET`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runReminders());
  } catch (error) {
    console.error("Reminder run failed:", error);
    return NextResponse.json({ error: "Reminder run failed" }, { status: 500 });
  }
}
