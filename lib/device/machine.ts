import {
  KIND_ACCESSORY,
  KIND_LABELS,
  PREPARE_STEPS,
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
export function spokenPrompt(state: DeviceState, signedIn: boolean): string {
  switch (state.screen) {
    case "menu":
      return "What would you like to measure?";
    case "prepare":
      return state.kind
        ? `${KIND_LABELS[state.kind]}. ${PREPARE_STEPS[state.kind].join(" ")} Then press Start.`
        : "";
    case "measuring":
      return state.kind ? `Measuring with the ${KIND_ACCESSORY[state.kind]}. Please stay still.` : "";
    case "result":
      return state.reading ? `${spokenReading(state.reading)} Press Save to keep it.` : "";
    case "saved":
      return signedIn ? "Saved. Your family can see it now." : "Done. This demo reading is not stored.";
    case "voice":
      return "I am listening. Say blood pressure, oxygen, temperature, weight or history.";
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

const VOICE_PATTERNS: [RegExp, VoiceCommand][] = [
  [/\b(pressure|bp|cuff)\b/, { type: "select", kind: "bp" }],
  [/\b(oxygen|spo2|oximeter|finger)\b/, { type: "select", kind: "spo2" }],
  [/\b(temperature|fever|thermometer)\b/, { type: "select", kind: "temp" }],
  [/\b(weight|weigh|scale)\b/, { type: "select", kind: "weight" }],
  [/\b(history|readings|past)\b/, { type: "history" }],
  [/\b(stop|cancel)\b/, { type: "stop" }],
  [/\b(back|home|menu)\b/, { type: "back" }],
  [/\b(start|begin|go)\b/, { type: "start" }],
  [/\b(save|confirm|yes|okay|ok)\b/, { type: "save" }],
];

/** Maps something the person said to a device command, or null if not understood. */
export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const said = transcript.toLowerCase();
  return VOICE_PATTERNS.find(([pattern]) => pattern.test(said))?.[1] ?? null;
}
