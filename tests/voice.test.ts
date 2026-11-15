import { describe, expect, it } from "vitest";
import {
  LANGUAGE_LABELS,
  isVoiceLanguage,
  listeningError,
  pickVoice,
  speakable,
  splitForSpeech,
} from "@/lib/voice/language";

describe("voice languages", () => {
  it("names Hindi in Devanagari", () => {
    expect(LANGUAGE_LABELS.hi).toBe("हिन्दी");
  });

  it("accepts only supported languages", () => {
    expect(isVoiceLanguage("hi")).toBe(true);
    expect(isVoiceLanguage("mr")).toBe(false);
    expect(isVoiceLanguage(undefined)).toBe(false);
  });
});

describe("pickVoice", () => {
  const voices = [
    { name: "Albert", lang: "en-US" },
    { name: "Rishi", lang: "en-IN" },
    { name: "Google UK English Female", lang: "en-GB" },
    { name: "Lekha", lang: "hi-IN" },
    { name: "Google हिन्दी", lang: "hi-IN" },
    { name: "Thomas", lang: "fr-FR" },
  ];

  it("prefers a natural voice over a plain system voice", () => {
    expect(pickVoice(voices, "en")?.name).toBe("Google UK English Female");
    expect(pickVoice(voices, "hi")?.name).toBe("Google हिन्दी");
  });

  it("prefers a neural Indian voice above all", () => {
    const neural = { name: "Microsoft Neerja Online (Natural) - English (India)", lang: "en-IN" };
    expect(pickVoice([...voices, neural], "en")).toBe(neural);
  });

  it("falls back to an Indian accent among plain voices", () => {
    expect(pickVoice([voices[0]!, voices[1]!], "en")?.name).toBe("Rishi");
  });

  it("never speaks Hindi with a voice from another language", () => {
    expect(pickVoice([voices[0]!, voices[5]!], "hi")).toBeNull();
    expect(pickVoice([{ name: "Android", lang: "hi_IN" }], "hi")?.lang).toBe("hi_IN");
  });
});

describe("speakable", () => {
  it("removes markdown, bullets and links", () => {
    expect(speakable("**Take** one tablet.\n- After food\n- With [water](https://example.com)")).toBe(
      "Take one tablet. After food. With water",
    );
  });

  it("keeps Devanagari text unchanged", () => {
    expect(speakable("आपकी दवा सुबह **आठ बजे** है।")).toBe("आपकी दवा सुबह आठ बजे है।");
  });
});

describe("splitForSpeech", () => {
  it("keeps short sentences together", () => {
    expect(splitForSpeech("Hello. How are you? I am fine.")).toEqual(["Hello. How are you? I am fine."]);
  });

  it("splits long text at sentence ends, including the Hindi danda", () => {
    const sentence = "यह एक लंबा वाक्य है जो बोलने के लिए लिखा गया है और इसमें काफ़ी शब्द हैं ताकि यह लंबा हो जाए।";
    const chunks = splitForSpeech(`${sentence} ${sentence} ${sentence}`);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.endsWith("।")).toBe(true);
  });

  it("returns nothing for empty text", () => {
    expect(splitForSpeech("  ")).toEqual([]);
  });
});

describe("listeningError", () => {
  it("is silent when listening was cancelled", () => {
    expect(listeningError("aborted")).toBe("");
  });
  it("points a network failure to Chrome and typing", () => {
    expect(listeningError("network")).toMatch(/Chrome/);
    expect(listeningError("network")).toMatch(/type/);
  });
  it("explains a blocked microphone", () => {
    expect(listeningError("not-allowed")).toMatch(/blocked/);
  });
});
