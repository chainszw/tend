"use server";

import { randomInt } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { devAccessEnabled } from "@/lib/dev";
import { DEMO_CIRCLE_CODE } from "@/lib/dev-mode";
import { hashPasscode } from "@/lib/passcode";
import { sealPasscode } from "@/lib/passcode-vault";
import { clearSession, createSession } from "@/lib/session";
import type { Role } from "@/lib/types";

const DEV_CODE = DEMO_CIRCLE_CODE;
const DEV_TIMEZONE = "Asia/Kolkata";
const DEV_MEMBERS: Record<Role, string> = {
  elder: "Asha Rao",
  family: "Ravi Rao",
  caretaker: "Meena (caretaker)",
};
const DAY_MS = 86_400_000;

/** Creates the demo circle with members, medicines and a visit. Returns its id. */
async function createDemoCircle(): Promise<string | null> {
  const supabase = db();
  // A random passcode nobody knows: the demo circle can only be opened through this shortcut.
  const passcode = String(randomInt(1_000_000)).padStart(6, "0");
  const { data: circle, error } = await supabase
    .from("circles")
    .insert({
      code: DEV_CODE,
      elder_name: DEV_MEMBERS.elder,
      elder_email: null,
      passcode_hash: await hashPasscode(passcode),
      passcode_enc: sealPasscode(passcode),
      timezone: DEV_TIMEZONE,
    })
    .select("id")
    .single();
  if (error || !circle) {
    // Another tab may have created it at the same moment.
    if (error?.code !== "23505") console.error("Create demo circle failed:", error?.message);
    return null;
  }

  const { data: members } = await supabase
    .from("members")
    .insert(
      (Object.keys(DEV_MEMBERS) as Role[]).map((role) => ({
        circle_id: circle.id,
        name: DEV_MEMBERS[role],
        email: null,
        role,
        notify: false,
      })),
    )
    .select("id, role");
  const familyId = members?.find((member) => member.role === "family")?.id ?? null;

  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("medications").insert([
    { name: "Metformin", dosage: "500 mg", instructions: "After food", purpose: "Blood sugar", times: ["08:00", "20:00"] },
    { name: "Amlodipine", dosage: "5 mg", instructions: "", purpose: "Blood pressure", times: ["08:00"] },
    { name: "Vitamin D3", dosage: "1 tablet", instructions: "With lunch", purpose: "Bone health", times: ["13:00"] },
    { name: "Atorvastatin", dosage: "10 mg", instructions: "At bedtime", purpose: "Cholesterol", times: ["21:30"] },
  ].map((medication) => ({ ...medication, circle_id: circle.id, start_date: today, created_by: familyId })));

  await supabase.from("appointments").insert({
    circle_id: circle.id,
    doctor: "Dr. Kavita Menon",
    specialty: "Cardiology",
    location: "City Heart Clinic, 2nd floor",
    starts_at: new Date(Date.now() + 3 * DAY_MS).toISOString(),
    notes: "Bring the last blood pressure readings.",
    created_by: familyId,
  });
  return circle.id;
}

/** Dev mode only: signs straight into the demo circle as the chosen role. */
export async function devSignInAction(role: Role): Promise<void> {
  if (!devAccessEnabled() || !(role in DEV_MEMBERS)) notFound();
  const supabase = db();

  const find = () => supabase.from("circles").select("id").eq("code", DEV_CODE).maybeSingle();
  let circleId = (await find()).data?.id ?? (await createDemoCircle());
  circleId ??= (await find()).data?.id ?? null;
  if (!circleId) throw new Error("Could not open the demo circle.");

  let { data: member } = await supabase
    .from("members")
    .select("id, name, role")
    .eq("circle_id", circleId)
    .eq("role", role)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!member) {
    ({ data: member } = await supabase
      .from("members")
      .insert({ circle_id: circleId, name: DEV_MEMBERS[role], email: null, role, notify: false })
      .select("id, name, role")
      .single());
  }
  if (!member) throw new Error("Could not open the demo circle.");

  await createSession({ circleId, memberId: member.id, name: member.name, role: member.role as Role });
  redirect("/circle");
}

/** Dev mode only: leaves the demo circle and returns to the landing page. */
export async function devSignOutAction(): Promise<void> {
  if (!devAccessEnabled()) notFound();
  await clearSession();
  redirect("/");
}
