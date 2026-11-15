import { describe, expect, it } from "vitest";
import { describeReadings } from "@/lib/care-record";
import {
  INITIAL_DEVICE_STATE,
  deviceReducer,
  parseVoiceCommand,
  primaryIntent,
  spokenPrompt,
  statusLine,
  type DeviceAction,
  type DeviceState,
} from "@/lib/device/machine";
import { DEVICE_PARTS, formatInr, partsTotal } from "@/lib/device/parts";
import {
  READING_KINDS,
  assessReading,
  cuffPressure,
  describeReading,
  displayReading,
  latestByKind,
  liveValue,
  readingFromRow,
  readingSchema,
  simulateReading,
  spokenReading,
  type ReadingInput,
  type StoredReading,
} from "@/lib/device/readings";

const bp: ReadingInput = { kind: "bp", systolic: 128, diastolic: 82, pulse: 72, irregular: false };
const run = (actions: DeviceAction[], from: DeviceState = INITIAL_DEVICE_STATE) =>
  actions.reduce(deviceReducer, from);
const MENU_ACTIONS: DeviceAction[] = [{ type: "power" }, { type: "booted" }];

describe("simulated readings", () => {
  it("always produces values the schema accepts", () => {
    for (const kind of READING_KINDS) {
      for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
        const reading = simulateReading(kind, () => r);
        expect(readingSchema.safeParse(reading).success).toBe(true);
        expect(reading.kind).toBe(kind);
      }
    }
  });

  it("is exact for a given random source", () => {
    expect(simulateReading("bp", () => 0.5)).toEqual({
      kind: "bp",
      systolic: 128,
      diastolic: 79,
      pulse: 75,
      irregular: false,
    });
    expect(simulateReading("temp", () => 0)).toEqual({ kind: "temp", temperature_c: 36.2 });
  });

  it("keeps a new weight close to the previous one", () => {
    const reading = simulateReading("weight", () => 1, 70);
    expect(reading).toEqual({ kind: "weight", weight_kg: 70.4 });
  });
});

describe("reading validation", () => {
  it("rejects impossible or mismatched values", () => {
    expect(readingSchema.safeParse({ ...bp, systolic: 400 }).success).toBe(false);
    expect(readingSchema.safeParse({ kind: "spo2", spo2: 101, pulse: 70 }).success).toBe(false);
    expect(readingSchema.safeParse({ kind: "temp", weight_kg: 60 }).success).toBe(false);
    expect(readingSchema.safeParse({ kind: "glucose", value: 5 }).success).toBe(false);
  });

  it("reads database rows and drops malformed ones", () => {
    const row = {
      id: "r1",
      kind: "temp",
      systolic: null,
      diastolic: null,
      pulse: null,
      spo2: null,
      temperature_c: 36.8,
      weight_kg: null,
      irregular: false,
      taken_at: "2026-11-15T06:00:00Z",
    };
    expect(readingFromRow(row)).toEqual({
      kind: "temp",
      temperature_c: 36.8,
      id: "r1",
      taken_at: "2026-11-15T06:00:00Z",
    });
    expect(readingFromRow({ ...row, temperature_c: null })).toBeNull();
    expect(readingFromRow({ ...row, kind: "other" })).toBeNull();
  });
});

describe("plain-word guidance", () => {
  it("grades blood pressure", () => {
    expect(assessReading(bp).level).toBe("ok");
    expect(assessReading({ ...bp, systolic: 146 }).level).toBe("watch");
    expect(assessReading({ ...bp, diastolic: 55 }).level).toBe("watch");
    expect(assessReading({ ...bp, systolic: 185 }).level).toBe("alert");
    expect(assessReading({ ...bp, irregular: true }).message).toMatch(/uneven heartbeat/i);
  });

  it("grades oxygen and temperature", () => {
    expect(assessReading({ kind: "spo2", spo2: 97, pulse: 70 }).level).toBe("ok");
    expect(assessReading({ kind: "spo2", spo2: 92, pulse: 70 }).level).toBe("watch");
    expect(assessReading({ kind: "spo2", spo2: 88, pulse: 70 }).level).toBe("alert");
    expect(assessReading({ kind: "temp", temperature_c: 36.9 }).level).toBe("ok");
    expect(assessReading({ kind: "temp", temperature_c: 38.2 }).level).toBe("watch");
    expect(assessReading({ kind: "temp", temperature_c: 39.6 }).level).toBe("alert");
  });

  it("formats readings for screens, lists and speech", () => {
    expect(displayReading(bp)).toEqual({ value: "128/82", unit: "mmHg", detail: "Pulse 72 beats a minute" });
    expect(describeReading(bp)).toBe("Blood pressure 128/82 mmHg, pulse 72 beats a minute");
    expect(describeReading({ kind: "spo2", spo2: 97, pulse: 70 })).toBe(
      "Blood oxygen 97%, pulse 70 beats a minute",
    );
    expect(describeReading({ kind: "weight", weight_kg: 61 })).toBe("Weight 61.0 kg");
    expect(spokenReading(bp)).toBe("Your blood pressure is 128 over 82. Pulse 72. In the usual range.");
  });

  it("describes readings for the AI", () => {
    expect(describeReadings([])).toMatch(/no health readings/i);
    expect(describeReadings([{ text: "Weight 61.0 kg", when: "Sunday" }])).toBe("- Weight 61.0 kg (Sunday)");
  });
});

describe("live measurement values", () => {
  it("pumps the cuff past systolic and lets it down below diastolic", () => {
    expect(cuffPressure(0, 128, 82)).toBe(0);
    expect(cuffPressure(0.4, 128, 82)).toBe(158);
    expect(cuffPressure(1, 128, 82)).toBe(70);
    expect(cuffPressure(5, 128, 82)).toBe(70);
  });

  it("settles on the final value", () => {
    expect(liveValue({ kind: "temp", temperature_c: 36.8 }, 1)).toBe("36.8");
    expect(liveValue({ kind: "weight", weight_kg: 61.5 }, 1)).toBe("61.5");
    expect(liveValue({ kind: "spo2", spo2: 97, pulse: 70 }, 0.1)).toBe("--");
    expect(liveValue({ kind: "spo2", spo2: 97, pulse: 70 }, 1)).toBe("97");
  });

  it("finds the newest reading of each kind", () => {
    const list: StoredReading[] = [
      { kind: "weight", weight_kg: 62, id: "a", taken_at: "2026-11-15T06:00:00Z" },
      { ...bp, id: "b", taken_at: "2026-11-15T05:00:00Z" },
      { kind: "weight", weight_kg: 61, id: "c", taken_at: "2026-11-14T06:00:00Z" },
    ];
    const latest = latestByKind(list);
    expect(latest.weight?.id).toBe("a");
    expect(latest.bp?.id).toBe("b");
    expect(latest.temp).toBeUndefined();
  });
});

describe("device state machine", () => {
  it("walks through a full measurement", () => {
    const state = run([
      ...MENU_ACTIONS,
      { type: "select", kind: "bp" },
      { type: "start", reading: bp },
      { type: "complete" },
    ]);
    expect(state).toEqual({ screen: "result", kind: "bp", reading: bp });
    expect(deviceReducer(state, { type: "save" }).screen).toBe("saved");
    expect(run([{ type: "save" }, { type: "back" }], state)).toEqual({
      screen: "menu",
      kind: null,
      reading: null,
    });
  });

  it("ignores actions that make no sense on the current screen", () => {
    expect(run([{ type: "select", kind: "bp" }])).toEqual(INITIAL_DEVICE_STATE);
    expect(run([{ type: "power" }, { type: "select", kind: "bp" }]).screen).toBe("boot");
    const preparing = run([...MENU_ACTIONS, { type: "select", kind: "temp" }]);
    expect(deviceReducer(preparing, { type: "start", reading: bp })).toEqual(preparing);
    expect(deviceReducer(preparing, { type: "complete" })).toEqual(preparing);
    expect(deviceReducer(preparing, { type: "save" })).toEqual(preparing);
  });

  it("cancels a running measurement and drops the reading", () => {
    const state = run([
      ...MENU_ACTIONS,
      { type: "select", kind: "bp" },
      { type: "start", reading: bp },
      { type: "back" },
    ]);
    expect(state).toEqual({ screen: "menu", kind: null, reading: null });
  });

  it("measures again and powers off from anywhere", () => {
    const result = run([
      ...MENU_ACTIONS,
      { type: "select", kind: "bp" },
      { type: "start", reading: bp },
      { type: "complete" },
    ]);
    expect(deviceReducer(result, { type: "again" })).toEqual({ screen: "prepare", kind: "bp", reading: null });
    expect(deviceReducer(result, { type: "power" })).toEqual(INITIAL_DEVICE_STATE);
    expect(run([...MENU_ACTIONS, { type: "history" }]).screen).toBe("history");
    expect(run([...MENU_ACTIONS, { type: "voice" }, { type: "select", kind: "spo2" }]).screen).toBe("prepare");
  });

  it("maps the big button and status text to each screen", () => {
    expect(primaryIntent("prepare")).toBe("start");
    expect(primaryIntent("measuring")).toBe("stop");
    expect(primaryIntent("result")).toBe("save");
    expect(primaryIntent("saved")).toBe("done");
    expect(primaryIntent("menu")).toBeNull();
    const measuring: DeviceState = { screen: "measuring", kind: "bp", reading: bp };
    expect(statusLine(measuring, 0.52)).toBe("Blood pressure: measuring, 50% done.");
    expect(statusLine(INITIAL_DEVICE_STATE, 0)).toMatch(/off/);
    expect(spokenPrompt({ screen: "result", kind: "bp", reading: bp }, true)).toMatch(/128 over 82/);
    expect(spokenPrompt({ screen: "saved", kind: "bp", reading: bp }, false)).toMatch(/not stored/);
    expect(spokenPrompt(INITIAL_DEVICE_STATE, true)).toBe("");
  });
});

describe("voice commands", () => {
  it("understands the things an elder is likely to say", () => {
    expect(parseVoiceCommand("check my blood pressure please")).toEqual({ type: "select", kind: "bp" });
    expect(parseVoiceCommand("Oxygen")).toEqual({ type: "select", kind: "spo2" });
    expect(parseVoiceCommand("do I have a fever")).toEqual({ type: "select", kind: "temp" });
    expect(parseVoiceCommand("weigh me")).toEqual({ type: "select", kind: "weight" });
    expect(parseVoiceCommand("show my history")).toEqual({ type: "history" });
    expect(parseVoiceCommand("start")).toEqual({ type: "start" });
    expect(parseVoiceCommand("please stop")).toEqual({ type: "stop" });
    expect(parseVoiceCommand("go back")).toEqual({ type: "back" });
    expect(parseVoiceCommand("yes save it")).toEqual({ type: "save" });
    expect(parseVoiceCommand("what is the weather")).toBeNull();
  });
});

describe("bill of materials", () => {
  it("has unique parts and adds up", () => {
    expect(new Set(DEVICE_PARTS.map((part) => part.id)).size).toBe(DEVICE_PARTS.length);
    const base = partsTotal(DEVICE_PARTS, false);
    const all = partsTotal(DEVICE_PARTS, true);
    expect(all - base).toBe(450);
    expect(base).toBe(2395);
    expect(formatInr(base)).toBe("₹2,395");
  });
});
