import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { requireEnv } from "@/lib/env";
import type { Role } from "@/lib/types";

const COOKIE_NAME = "tend_session";
const SESSION_DAYS = 30;
const ROLES: readonly string[] = ["elder", "family", "caretaker"];

export interface Session {
  circleId: string;
  memberId: string;
  name: string;
  role: Role;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(requireEnv("SESSION_SECRET"));
}

/** Signs a session and stores it in an HttpOnly cookie. */
export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

/** Reads and verifies the session cookie. Returns null when absent or invalid. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const { circleId, memberId, name, role } = payload;
    if (
      typeof circleId !== "string" ||
      typeof memberId !== "string" ||
      typeof name !== "string" ||
      typeof role !== "string" ||
      !ROLES.includes(role)
    ) {
      return null;
    }
    return { circleId, memberId, name, role: role as Role };
  } catch {
    return null;
  }
});

/** Returns the session or sends the visitor to the join page. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/join");
  return session;
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
