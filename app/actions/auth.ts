"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isLocked, minutesUntilUnlock, registerFailure } from "@/lib/lockout";
import {
  generateCircleCode,
  hashPasscode,
  normaliseCircleCode,
  verifyPasscode,
} from "@/lib/passcode";
import { sealPasscode } from "@/lib/passcode-vault";
import { createRateLimiter } from "@/lib/rate-limit";
import { clearSession, createSession } from "@/lib/session";
import type { ActionState, Role } from "@/lib/types";
import { createCircleSchema, fieldErrors, joinCircleSchema } from "@/lib/validation";

const allowAttempt = createRateLimiter(10, 60_000);
const GENERIC_JOIN_ERROR = "That family code and passcode do not match. Check both and try again.";

async function clientKey(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function formValues(formData: FormData, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "")]));
}

/** Creates a family, its first member, and signs that member in. */
export async function createCircleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!allowAttempt(`create:${await clientKey()}`)) {
    return { ok: false, message: "Too many attempts. Wait a minute and try again." };
  }
  const parsed = createCircleSchema.safeParse(
    formValues(formData, [
      "elderName", "elderEmail", "yourName", "yourEmail", "role", "passcode", "timezone",
    ]),
  );
  if (!parsed.success) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;
  const isElder = input.role === "elder";
  const passcodeHash = await hashPasscode(input.passcode);
  const supabase = db();

  let circle: { id: string } | null = null;
  for (let attempt = 0; attempt < 5 && !circle; attempt += 1) {
    const { data, error } = await supabase
      .from("circles")
      .insert({
        code: generateCircleCode(),
        elder_name: isElder ? input.yourName : input.elderName,
        elder_email: isElder ? (input.yourEmail ?? input.elderEmail) : input.elderEmail,
        passcode_hash: passcodeHash,
        passcode_enc: sealPasscode(input.passcode),
        timezone: input.timezone,
      })
      .select("id")
      .single();
    if (data) circle = data;
    else if (error?.code !== "23505") {
      console.error("Create family failed:", error?.message);
      return { ok: false, message: "We could not create the family. Try again." };
    }
  }
  if (!circle) return { ok: false, message: "We could not create the family. Try again." };

  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({
      circle_id: circle.id,
      name: input.yourName,
      email: input.yourEmail,
      role: input.role,
    })
    .select("id")
    .single();
  if (memberError || !member) {
    console.error("Create member failed:", memberError?.message);
    return { ok: false, message: "We could not create the family. Try again." };
  }

  await createSession({
    circleId: circle.id,
    memberId: member.id,
    name: input.yourName,
    role: input.role,
  });
  redirect("/circle/family?welcome=1");
}

/** Joins (or signs back in to) a family with its code and passcode. */
export async function joinCircleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!allowAttempt(`join:${await clientKey()}`)) {
    return { ok: false, message: "Too many attempts. Wait a minute and try again." };
  }
  const parsed = joinCircleSchema.safeParse(
    formValues(formData, ["code", "passcode", "yourName", "yourEmail", "role"]),
  );
  if (!parsed.success) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;
  const supabase = db();
  const now = new Date();

  const { data: circle } = await supabase
    .from("circles")
    .select("id, passcode_hash, failed_attempts, locked_until")
    .eq("code", normaliseCircleCode(input.code))
    .maybeSingle();
  if (!circle) return { ok: false, message: GENERIC_JOIN_ERROR };

  if (isLocked(circle, now)) {
    return {
      ok: false,
      message: `Too many wrong passcodes. This family is locked for ${minutesUntilUnlock(circle, now)} more minutes.`,
    };
  }

  if (!(await verifyPasscode(input.passcode, circle.passcode_hash))) {
    await supabase.from("circles").update(registerFailure(circle, now)).eq("id", circle.id);
    return { ok: false, message: GENERIC_JOIN_ERROR };
  }
  if (circle.failed_attempts > 0 || circle.locked_until) {
    await supabase
      .from("circles")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("id", circle.id);
  }

  // Returning members are matched by email (or by name when no email was given).
  let existing = supabase.from("members").select("id, name, role").eq("circle_id", circle.id);
  existing = input.yourEmail
    ? existing.ilike("email", input.yourEmail)
    : existing.ilike("name", input.yourName).is("email", null);
  const { data: found } = await existing.limit(1).maybeSingle();

  let member: { id: string; name: string; role: Role } | null = found;
  if (!member) {
    const { data: created, error } = await supabase
      .from("members")
      .insert({
        circle_id: circle.id,
        name: input.yourName,
        email: input.yourEmail,
        role: input.role,
      })
      .select("id, name, role")
      .single();
    if (error || !created) {
      console.error("Join family failed:", error?.message);
      return { ok: false, message: "We could not add you to the family. Try again." };
    }
    member = created;
    await supabase.from("activity").insert({
      circle_id: circle.id,
      member_name: created.name,
      member_role: created.role,
      summary: "joined the family",
    });
  }

  await createSession({
    circleId: circle.id,
    memberId: member.id,
    name: member.name,
    role: member.role,
  });
  redirect("/circle");
}

export async function signOutAction(): Promise<void> {
  await clearSession();
  redirect("/");
}
