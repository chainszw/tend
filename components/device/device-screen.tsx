"use client";

import type { ReactNode } from "react";
import {
  ArrowLeft,
  BatteryFull,
  Check,
  Droplet,
  HeartPulse,
  History,
  Mic,
  Play,
  RotateCcw,
  Square,
  Thermometer,
  Weight,
  type LucideIcon,
} from "lucide-react";
import type { DeviceAction, DeviceState } from "@/lib/device/machine";
import {
  KIND_ACCESSORY,
  KIND_LABELS,
  PREPARE_STEPS,
  READING_KINDS,
  assessReading,
  displayReading,
  latestByKind,
  liveValue,
  type ReadingKind,
  type ReadingLevel,
  type StoredReading,
} from "@/lib/device/readings";

/** The LCD is drawn at a fixed pixel size and scaled onto the 3D model. */
export const SCREEN_WIDTH = 520;
export const SCREEN_HEIGHT = 390;

const KIND_ICONS: Record<ReadingKind, { icon: LucideIcon; color: string }> = {
  bp: { icon: HeartPulse, color: "#ff9d92" },
  spo2: { icon: Droplet, color: "#8fd0ff" },
  temp: { icon: Thermometer, color: "#ffc875" },
  weight: { icon: Weight, color: "#c9b8ff" },
};

const LIVE_UNITS: Record<ReadingKind, string> = {
  bp: "mmHg in the cuff",
  spo2: "% oxygen",
  temp: "°C",
  weight: "kg",
};

const LEVEL_STYLES: Record<ReadingLevel, string> = {
  ok: "bg-[#103c2a] text-[#9af3c6]",
  watch: "bg-[#4a3506] text-[#ffd98a]",
  alert: "bg-[#5a1410] text-[#ffc1ba]",
};

const BUTTON =
  "inline-flex min-h-[58px] cursor-pointer items-center justify-center gap-2 rounded-[14px] px-5 text-[22px] font-bold disabled:opacity-60 [&_svg]:size-6";
const BUTTON_MAIN = `${BUTTON} bg-[#4be3a2] text-[#04130c] hover:bg-[#7cf0bf]`;
const BUTTON_QUIET = `${BUTTON} border-2 border-[#5b7a6d] bg-transparent text-white hover:bg-[#12251d]`;

export interface VoiceStatus {
  canListen: boolean;
  listening: boolean;
  heard: string;
}

export interface DeviceScreenProps {
  state: DeviceState;
  progress: number;
  clock: string;
  history: readonly StoredReading[];
  elderName: string | null;
  saving: boolean;
  voice: VoiceStatus;
  onAction: (action: DeviceAction) => void;
  onPrimary: () => void;
  onListen: () => void;
}

function Footer({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex items-center justify-between gap-3">{children}</div>;
}

function BackButton({ onAction, label = "Back" }: Pick<DeviceScreenProps, "onAction"> & { label?: string }) {
  return (
    <button type="button" className={BUTTON_QUIET} onClick={() => onAction({ type: "back" })}>
      <ArrowLeft aria-hidden="true" />
      {label}
    </button>
  );
}

function Menu({ onAction }: Pick<DeviceScreenProps, "onAction">) {
  const tile =
    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-[#25463a] bg-[#11231c] text-[20px] font-bold leading-tight hover:bg-[#183328]";
  return (
    <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-[10px]">
      {READING_KINDS.map((kind) => {
        const { icon: Icon, color } = KIND_ICONS[kind];
        return (
          <button key={kind} type="button" className={tile} onClick={() => onAction({ type: "select", kind })}>
            <Icon aria-hidden="true" className="size-[46px]" style={{ color }} strokeWidth={1.9} />
            {KIND_LABELS[kind]}
          </button>
        );
      })}
      <button type="button" className={tile} onClick={() => onAction({ type: "history" })}>
        <History aria-hidden="true" className="size-[46px] text-[#9af3c6]" strokeWidth={1.9} />
        Health history
      </button>
      <button type="button" className={tile} onClick={() => onAction({ type: "voice" })}>
        <Mic aria-hidden="true" className="size-[46px] text-[#ffd98a]" strokeWidth={1.9} />
        Voice assistant
      </button>
    </div>
  );
}

function Heading({ kind }: { kind: ReadingKind }) {
  const { icon: Icon, color } = KIND_ICONS[kind];
  return (
    <h2 className="flex items-center gap-3 text-[28px] font-extrabold leading-none">
      <Icon aria-hidden="true" className="size-9" style={{ color }} />
      {KIND_LABELS[kind]}
    </h2>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * 96 + 2},${30 - ((value - min) / span) * 26}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 34" className="h-[34px] w-[100px]" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#c9b8ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HistoryList({ history }: { history: readonly StoredReading[] }) {
  const latest = latestByKind(history);
  const weights = history
    .flatMap((reading) => (reading.kind === "weight" ? [reading.weight_kg] : []))
    .slice(0, 8)
    .reverse();
  const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <ul className="flex flex-col gap-[6px]">
      {READING_KINDS.map((kind) => {
        const reading = latest[kind];
        const shown = reading ? displayReading(reading) : null;
        return (
          <li key={kind} className="flex items-center justify-between gap-3 rounded-[12px] bg-[#11231c] px-4 py-[7px]">
            <span className="text-[19px] font-bold">{KIND_LABELS[kind]}</span>
            {reading && shown ? (
              <span className="flex items-center gap-3 text-right">
                {kind === "weight" && weights.length > 1 ? <Sparkline values={weights} /> : null}
                <span className="leading-tight">
                  <span className="block text-[22px] font-extrabold tabular-nums">
                    {shown.value} <span className="text-[15px] font-bold text-[#b7cbc1]">{shown.unit}</span>
                  </span>
                  <span className="block text-[13px] text-[#b7cbc1]">{day.format(new Date(reading.taken_at))}</span>
                </span>
              </span>
            ) : (
              <span className="text-[17px] text-[#b7cbc1]">No reading yet</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Everything shown on the Home Station's screen. Plain HTML, so it is fully accessible. */
export function DeviceScreen({
  state,
  progress,
  clock,
  history,
  elderName,
  saving,
  voice,
  onAction,
  onPrimary,
  onListen,
}: DeviceScreenProps) {
  const { screen, kind, reading } = state;
  const frame = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };

  if (screen === "off") {
    return (
      <div style={frame} className="rounded-[20px] bg-[#07110d]" role="img" aria-label="The screen is off" />
    );
  }

  let body: ReactNode = null;
  if (screen === "boot") {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="text-[64px] font-extrabold leading-none tracking-tight">Tend</p>
        <p className="text-[22px] text-[#b7cbc1]">{elderName ? `Namaste, ${elderName}` : "Namaste"}</p>
      </div>
    );
  } else if (screen === "menu") {
    body = <Menu onAction={onAction} />;
  } else if (screen === "prepare" && kind) {
    body = (
      <>
        <Heading kind={kind} />
        <ol className="mt-4 flex flex-col gap-[10px]">
          {PREPARE_STEPS[kind].map((step, index) => (
            <li key={step} className="flex items-center gap-3 text-[21px] leading-snug">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1d3b30] text-[19px] font-extrabold">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <Footer>
          <BackButton onAction={onAction} />
          <button type="button" className={`${BUTTON_MAIN} min-w-[190px]`} onClick={onPrimary}>
            <Play aria-hidden="true" />
            Start
          </button>
        </Footer>
      </>
    );
  } else if (screen === "measuring" && kind && reading) {
    body = (
      <>
        <Heading kind={kind} />
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-[104px] font-extrabold leading-none tabular-nums">{liveValue(reading, progress)}</p>
          <p className="mt-1 text-[20px] text-[#b7cbc1]">{LIVE_UNITS[kind]}</p>
        </div>
        <div
          role="progressbar"
          aria-label={`Measuring with the ${KIND_ACCESSORY[kind]}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="mb-3 h-[14px] overflow-hidden rounded-full bg-[#1d3b30]"
        >
          <div className="h-full rounded-full bg-[#4be3a2]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <Footer>
          <p className="text-[19px] text-[#b7cbc1]">Stay still…</p>
          <button
            type="button"
            className={`${BUTTON} min-w-[170px] bg-[#f2b33d] text-[#201500] hover:bg-[#ffc95e]`}
            onClick={onPrimary}
          >
            <Square aria-hidden="true" />
            Stop
          </button>
        </Footer>
      </>
    );
  } else if (screen === "result" && kind && reading) {
    const shown = displayReading(reading);
    const assessment = assessReading(reading);
    body = (
      <>
        <Heading kind={kind} />
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-[84px] font-extrabold leading-none tabular-nums">
            {shown.value}
            <span className="ml-2 text-[30px] font-bold text-[#b7cbc1]">{shown.unit}</span>
          </p>
          {shown.detail ? <p className="mt-1 text-[20px] text-[#d6e4dc]">{shown.detail}</p> : null}
          <p className={`mt-2 rounded-[12px] px-4 py-2 text-[19px] font-bold leading-snug ${LEVEL_STYLES[assessment.level]}`}>
            {assessment.message}
          </p>
        </div>
        <Footer>
          <button type="button" className={BUTTON_QUIET} disabled={saving} onClick={() => onAction({ type: "again" })}>
            <RotateCcw aria-hidden="true" />
            Again
          </button>
          <button type="button" className={`${BUTTON_MAIN} min-w-[190px]`} disabled={saving} onClick={onPrimary}>
            <Check aria-hidden="true" />
            {saving ? "Saving…" : "Save"}
          </button>
        </Footer>
      </>
    );
  } else if (screen === "saved") {
    body = (
      <>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <span className="flex size-[92px] items-center justify-center rounded-full bg-[#4be3a2] text-[#04130c]">
            <Check aria-hidden="true" className="size-14" strokeWidth={3.5} />
          </span>
          <p className="text-[34px] font-extrabold leading-none">{elderName ? "Saved" : "Done"}</p>
          <p className="max-w-[420px] text-[20px] leading-snug text-[#d6e4dc]">
            {elderName
              ? `Added to ${elderName}'s family. Everyone can see it now.`
              : "This demo reading stays on this page only. Join a family to keep readings."}
          </p>
        </div>
        <Footer>
          <button type="button" className={BUTTON_QUIET} onClick={() => onAction({ type: "again" })}>
            <RotateCcw aria-hidden="true" />
            Again
          </button>
          <button type="button" className={`${BUTTON_MAIN} min-w-[190px]`} onClick={onPrimary}>
            Done
          </button>
        </Footer>
      </>
    );
  } else if (screen === "history") {
    body = (
      <>
        <HistoryList history={history} />
        <Footer>
          <BackButton onAction={onAction} label="Menu" />
          <p className="text-[15px] text-[#b7cbc1]">Latest reading of each kind</p>
        </Footer>
      </>
    );
  } else if (screen === "voice") {
    body = (
      <>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <span
            className={`flex size-[84px] items-center justify-center rounded-full ${voice.listening ? "animate-pulse bg-[#ffd98a] text-[#201500]" : "bg-[#1d3b30] text-[#ffd98a]"}`}
          >
            <Mic aria-hidden="true" className="size-12" />
          </span>
          <p className="text-[24px] font-extrabold leading-tight">
            {voice.listening ? "Listening…" : voice.canListen ? "Press Listen, then speak" : "Spoken guidance is on"}
          </p>
          <p className="max-w-[440px] text-[18px] leading-snug text-[#d6e4dc]">
            {voice.canListen
              ? "Say: blood pressure, oxygen, temperature, weight, history, start, stop or save."
              : "This browser cannot listen, but the device still reads every step and result aloud."}
          </p>
          {voice.heard ? <p className="text-[17px] text-[#9af3c6]">Heard: “{voice.heard}”</p> : null}
        </div>
        <Footer>
          <BackButton onAction={onAction} label="Menu" />
          {voice.canListen ? (
            <button type="button" className={`${BUTTON_MAIN} min-w-[190px]`} onClick={onListen} aria-pressed={voice.listening}>
              <Mic aria-hidden="true" />
              {voice.listening ? "Stop" : "Listen"}
            </button>
          ) : null}
        </Footer>
      </>
    );
  }

  return (
    <div
      style={frame}
      data-screen={screen}
      className="flex flex-col overflow-hidden rounded-[20px] bg-[#07110d] font-sans text-white select-none [&_button:focus-visible]:outline-[#ffd98a]"
    >
      <div className="flex h-[40px] shrink-0 items-center justify-between px-4 text-[17px] font-bold text-[#b7cbc1]">
        <span>{elderName ?? "Demo mode"}</span>
        <span className="flex items-center gap-2 tabular-nums">
          {clock}
          <BatteryFull aria-hidden="true" className="size-5" />
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-[14px] pb-[14px]">{body}</div>
    </div>
  );
}
