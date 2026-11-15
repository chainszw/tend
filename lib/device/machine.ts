import type { VoiceLanguage } from "@/lib/voice/language";
import {
  KIND_ACCESSORY,
  KIND_LABELS,
  KIND_LABELS_HI,
  PREPARE_STEPS,
  PREPARE_STEPS_HI,
  spokenReading,
  type ReadingInput,
  type ReadingKind,
} from "@/lib/device/readings";

/** The software running on the Home Station's screen, as a pure state machine. */

export type DeviceScreenName =
  | "off"
  | "boot"
  | "menu"
  | "prepare"
  | "measuring"
  | "result"
  | "saved"
  | "history"
  | "voice";

export interface DeviceState {
  screen: DeviceScreenName;
  kind: ReadingKind | null;
  reading: ReadingInput | null;
}

export type DeviceAction =
  | { type: "power" }
  | { type: "booted" }
  | { type: "select"; kind: ReadingKind }
  | { type: "history" }
  | { type: "voice" }
  | { type: "start"; reading: ReadingInput }
  | { type: "complete" }
  | { type: "save" }
  | { type: "again" }
  | { type: "back" };

export const INITIAL_DEVICE_STATE: DeviceState = { screen: "off", kind: null, reading: null };

const MENU: DeviceState = { screen: "menu", kind: null, reading: null };
const IDLE_SCREENS: readonly DeviceScreenName[] = ["menu", "history", "voice", "saved"];

export function deviceReducer(state: DeviceState, action: DeviceAction): DeviceState {
  switch (action.type) {
    case "power":
      return state.screen === "off" ? { ...INITIAL_DEVICE_STATE, screen: "boot" } : INITIAL_DEVICE_STATE;
    case "booted":
      return state.screen === "boot" ? MENU : state;
    case "select":
      return IDLE_SCREENS.includes(state.screen)
        ? { screen: "prepare", kind: action.kind, reading: null }
        : state;
    case "history":
    case "voice":
      return IDLE_SCREENS.includes(state.screen) ? { ...MENU, screen: action.type } : state;
    case "start":
      return state.screen === "prepare" && action.reading.kind === state.kind
        ? { ...state, screen: "measuring", reading: action.reading }
        : state;
    case "complete":
      return state.screen === "measuring" ? { ...state, screen: "result" } : state;
    case "save":
      return state.screen === "result" ? { ...state, screen: "saved" } : state;
    case "again":
      return (state.screen === "result" || state.screen === "saved") && state.kind
        ? { screen: "prepare", kind: state.kind, reading: null }
        : state;
    case "back":
      return state.screen === "off" || state.screen === "boot" ? state : MENU;
  }
}

export type PrimaryIntent = "start" | "stop" | "save" | "done";

/** What the large Start/Stop button does on each screen (null = nothing). */
export function primaryIntent(screen: DeviceScreenName): PrimaryIntent | null {
  switch (screen) {
    case "prepare":
      return "start";
    case "measuring":
      return "stop";
    case "result":
      return "save";
    case "saved":
      return "done";
    default:
      return null;
  }
}

export const PRIMARY_LABELS: Record<PrimaryIntent, string> = {
  start: "Start",
  stop: "Stop",
  save: "Save",
  done: "Done",
};

/** What the voice assistant says when a screen appears. Empty = stay quiet. */
export function spokenPrompt(state: DeviceState, signedIn: boolean, language: VoiceLanguage = "en"): string {
  if (language === "hi") return spokenPromptHindi(state, signedIn);
  switch (state.screen) {
    case "menu":
      return "What would you like to measure?";
    case "prepare":
      return state.kind
        ? `${KIND_LABELS[state.kind]}. ${PREPARE_STEPS[state.kind].join(" ")} Then say start, or press Start.`
        : "";
    case "measuring":
      return state.kind ? `Measuring with the ${KIND_ACCESSORY[state.kind]}. Please stay still.` : "";
    case "result":
      return state.reading
        ? `${spokenReading(state.reading)} Would you like to save this reading? Say yes, or press Save.`
        : "";
    case "saved":
      return signedIn ? "Saved. Your family can see it now." : "Done. This demo reading is not stored.";
    case "voice":
      return "I am listening. Say blood pressure, oxygen, temperature, weight or history.";
    default:
      return "";
  }
}

function spokenPromptHindi(state: DeviceState, signedIn: boolean): string {
  switch (state.screen) {
    case "menu":
      return "आप क्या नापना चाहेंगे?";
    case "prepare":
      return state.kind
        ? `${KIND_LABELS_HI[state.kind]}। ${PREPARE_STEPS_HI[state.kind].join(" ")} फिर शुरू बोलिए, या स्टार्ट बटन दबाइए।`
        : "";
    case "measuring":
      return state.kind ? "नाप चल रही है। कृपया स्थिर रहिए।" : "";
    case "result":
      return state.reading
        ? `${spokenReading(state.reading, "hi")} क्या आप यह रीडिंग सेव करना चाहेंगे? हाँ बोलिए, या सेव बटन दबाइए।`
        : "";
    case "saved":
      return signedIn
        ? "सेव हो गया। अब आपका परिवार इसे देख सकता है।"
        : "हो गया। यह डेमो रीडिंग सेव नहीं की गई है।";
    case "voice":
      return "मैं सुन रही हूँ। ब्लड प्रेशर, ऑक्सीजन, तापमान, वज़न या रिपोर्ट बोलिए।";
    default:
      return "";
  }
}

/** One line describing the device for people who cannot see the 3D view. */
export function statusLine(state: DeviceState, progress: number): string {
  const label = state.kind ? KIND_LABELS[state.kind] : "";
  switch (state.screen) {
    case "off":
      return "The device is off. Press Power to turn it on.";
    case "boot":
      return "Starting up.";
    case "menu":
      return "Main menu. Choose what to measure.";
    case "prepare":
      return `${label}: get ready, then press Start.`;
    case "measuring":
      return `${label}: measuring, ${Math.round(Math.min(1, Math.max(0, progress)) * 10) * 10}% done.`;
    case "result":
      return `${label}: result ready. Press Save to keep it.`;
    case "saved":
      return `${label}: finished.`;
    case "history":
      return "Health history.";
    case "voice":
      return "Voice assistant.";
  }
}

export type VoiceCommand =
  | { type: "select"; kind: ReadingKind }
  | { type: "history" | "start" | "stop" | "save" | "back" };

/**
 * English words and their Hindi equivalents (Devanagari, as the recogniser writes
 * them). `\\b` does not understand Devanagari, so the Hindi words are matched as they are.
 */
const VOICE_PATTERNS: [RegExp, VoiceCommand][] = [
  [/\b(pressure|bp|cuff)\b|ब्लड प्रेशर|प्रेशर|बीपी|रक्तचाप/, { type: "select", kind: "bp" }],
  [/\b(oxygen|spo2|oximeter|finger)\b|ऑक्सीजन|आक्सीजन|ऑक्सिजन/, { type: "select", kind: "spo2" }],
  [/\b(temperature|fever|thermometer)\b|तापमान|बुखार|टेम्परेचर|थर्मामीटर/, { type: "select", kind: "temp" }],
  [/\b(weight|weigh|scale)\b|वजन|वेट/, { type: "select", kind: "weight" }],
  [/\b(history|readings|past|report|latest)\b|रिपोर्ट|इतिहास|पिछल|हिस्ट्री/, { type: "history" }],
  [/\b(stop|cancel)\b|रुक|रद्द|बंद|कैंसल|स्टॉप/, { type: "stop" }],
  [/\b(back|home|menu)\b|वापस|पीछे|मेनू|मेन्यू/, { type: "back" }],
  [/\b(start|begin|go)\b|शुरू|शुरु|स्टार्ट|चालू/, { type: "start" }],
  [/\b(save|confirm|yes|okay|ok)\b|हाँ|हां|सेव|सहेज|ठीक है/, { type: "save" }],
];

/** Maps something the person said to a device command, or null if not understood. */
export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  // The nukta dot (ज़ / ज) is written inconsistently, so it is ignored.
  const said = transcript.toLowerCase().normalize("NFC").replace(/\u093c/g, "");
  return VOICE_PATTERNS.find(([pattern]) => pattern.test(said))?.[1] ?? null;
}
