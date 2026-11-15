import { describe, expect, it } from "vitest";
import {
  cleanModelText,
  cleanTranscription,
  extractJson,
  MAX_TRANSCRIPTION_CHARS,
  parseMedicationDrafts,
  parseQuestions,
} from "@/lib/ai-parse";

describe("cleanModelText", () => {
  it("removes reasoning blocks and code fences", () => {
    expect(cleanModelText("<think>hmm</think>\n```json\n{\"a\":1}\n```")).toBe('{"a":1}');
  });
});

describe("extractJson", () => {
  it("finds JSON surrounded by prose", () => {
    expect(extractJson('Here you go: {"a": [1, 2]} Hope that helps!')).toEqual({ a: [1, 2] });
  });

  it("handles a top-level array", () => {
    expect(extractJson('["one", "two"]')).toEqual(["one", "two"]);
  });

  it("throws when there is no JSON", () => {
    expect(() => extractJson("I cannot help with that.")).toThrow();
    expect(() => extractJson("{ unfinished")).toThrow();
  });
});

describe("parseMedicationDrafts", () => {
  it("parses well-formed output", () => {
    const output = JSON.stringify({
      medications: [
        {
          name: "Metformin",
          dosage: "500 mg",
          instructions: "After food",
          purpose: "Blood sugar",
          times: ["20:00", "08:00"],
        },
      ],
    });
    expect(parseMedicationDrafts(output)).toEqual([
      {
        name: "Metformin",
        dosage: "500 mg",
        instructions: "After food",
        purpose: "Blood sugar",
        times: ["08:00", "20:00"],
      },
    ]);
  });

  it("repairs loose times and missing fields", () => {
    const output = '{"medications":[{"name":"Amlodipine","times":["8:00","8.00","25:00","soon"],"dosage":null}]}';
    const [draft] = parseMedicationDrafts(output);
    expect(draft.times).toEqual(["08:00"]);
    expect(draft.dosage).toBe("");
    expect(draft.instructions).toBe("");
  });

  it("falls back to a morning time when none is usable", () => {
    const [draft] = parseMedicationDrafts('[{"name":"Vitamin D","times":[]}]');
    expect(draft.times).toEqual(["08:00"]);
  });

  it("drops entries without a name and rejects non-lists", () => {
    expect(parseMedicationDrafts('{"medications":[{"dosage":"5 mg","times":["08:00"]}]}')).toEqual([]);
    expect(() => parseMedicationDrafts('{"medications":"none"}')).toThrow();
  });
});

describe("parseQuestions", () => {
  it("keeps up to six non-empty questions", () => {
    const output = JSON.stringify({ questions: ["A?", " ", 4, "B?", "C?", "D?", "E?", "F?", "G?"] });
    expect(parseQuestions(output)).toEqual(["A?", "B?", "C?", "D?", "E?", "F?"]);
  });
});

describe("cleanTranscription", () => {
  it("returns the transcribed text, trimmed", () => {
    expect(cleanTranscription("  Tab. Metformin 500 mg BD \n")).toBe("Tab. Metformin 500 mg BD");
  });

  it("treats NO_TEXT or nothing as nothing read", () => {
    expect(cleanTranscription(" NO_TEXT\n")).toBe("");
    expect(cleanTranscription("<think>looking</think>")).toBe("");
  });

  it("caps very long transcriptions", () => {
    expect(cleanTranscription("a".repeat(9000))).toHaveLength(MAX_TRANSCRIPTION_CHARS);
  });
});
