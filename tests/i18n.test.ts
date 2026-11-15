import { describe, expect, it } from "vitest";
import { formatLongDate, formatWeekday } from "@/lib/format";
import { dateLocale, messages } from "@/lib/i18n";
import { resolveLanguage } from "@/lib/preferences";
import { formatTime, formatTimeIn } from "@/lib/schedule";

const DEVANAGARI = /[ऀ-ॿ]/;

/** Walks both dictionaries side by side and returns every mismatch. */
function differences(en: unknown, hi: unknown, path = ""): string[] {
  if (typeof en !== typeof hi) return [`${path}: ${typeof en} vs ${typeof hi}`];
  if (typeof en === "string") return (hi as string).trim() ? [] : [`${path}: empty`];
  if (typeof en === "function") return [];
  const a = en as Record<string, unknown>;
  const b = hi as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].flatMap((key) => differences(a[key], b[key], `${path}.${key}`));
}

describe("page words", () => {
  const en = messages("en");
  const hi = messages("hi");

  it("has a Hindi entry, of the same kind, for every English one", () => {
    expect(differences(en, hi)).toEqual([]);
  });

  it("writes the Hindi screens in Devanagari", () => {
    expect(hi.settings).toMatch(DEVANAGARI);
    expect(hi.nav.today).toMatch(DEVANAGARI);
    expect(hi.askTitle).toMatch(DEVANAGARI);
  });

  it("keeps names and medicines exactly as written", () => {
    expect(hi.dueOne("Metformin")).toContain("Metformin");
    expect(hi.greeting(9, "Asha")).toContain("Asha");
    expect(hi.circleLine("Asha Rao", "Ravi")).toContain("Asha Rao");
    expect(hi.suggestionsElder("Amlodipine")[1]).toContain("Amlodipine");
    expect(en.greeting(9, "Asha")).toBe("Good morning, Asha");
    expect(en.greeting(18, "Asha")).toBe("Good evening, Asha");
  });

  it("offers the same number of suggested questions in both languages", () => {
    expect(hi.suggestionsElder(undefined)).toHaveLength(en.suggestionsElder(undefined).length);
    expect(hi.suggestionsFamily("Asha")).toHaveLength(en.suggestionsFamily("Asha").length);
  });
});

describe("page language", () => {
  it("reads the cookie and falls back to English", () => {
    expect(resolveLanguage("hi")).toBe("hi");
    expect(resolveLanguage("en")).toBe("en");
    expect(resolveLanguage("fr")).toBe("en");
    expect(resolveLanguage(undefined)).toBe("en");
  });

  it("writes dates and times in the chosen language", () => {
    expect(dateLocale("hi")).toBe("hi-IN");
    expect(formatLongDate("2026-11-15", dateLocale("hi"))).toMatch(DEVANAGARI);
    expect(formatWeekday("2026-11-15", dateLocale("hi"))).toMatch(DEVANAGARI);
    expect(formatLongDate("2026-11-15")).toBe(formatLongDate("2026-11-15", dateLocale("en")));
    expect(formatTimeIn("08:30", "hi")).toBe("सुबह 8:30 बजे");
    expect(formatTimeIn("21:05", "hi")).toBe("रात 9:05 बजे");
    expect(formatTimeIn("13:00", "en")).toBe(formatTime("13:00"));
  });
});
