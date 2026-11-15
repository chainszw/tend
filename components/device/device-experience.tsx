"use client";

import {
  Component,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Layers, Maximize2, Power, Volume2, VolumeX, ZoomIn } from "lucide-react";
import { saveReadingAction } from "@/app/actions/readings";
import { DeviceScreen, SCREEN_HEIGHT, SCREEN_WIDTH } from "@/components/device/device-screen";
import type { DeviceView } from "@/components/device/device-scene";
import { InsidePanel } from "@/components/device/inside-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { LanguageSelect } from "@/components/voice/language-select";
import { MicButton } from "@/components/voice/mic-button";
import { useListening } from "@/components/voice/use-listening";
import { stopSpeaking, useSpeech, useVoicePreferences } from "@/components/voice/voice-store";
import {
  INITIAL_DEVICE_STATE,
  PRIMARY_LABELS,
  deviceReducer,
  parseVoiceCommand,
  primaryIntent,
  spokenPrompt,
  statusLine,
  type DeviceAction,
} from "@/lib/device/machine";
import {
  MEASURE_MS,
  latestByKind,
  simulateReading,
  type StoredReading,
} from "@/lib/device/readings";

const BOOT_MS = 1500;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function SceneSkeleton() {
  return (
    <div className="flex h-full items-center justify-center text-lg text-muted-foreground" role="status">
      Loading the 3D device…
    </div>
  );
}

const DeviceScene = dynamic(
  () => import("@/components/device/device-scene").then((module) => module.DeviceScene),
  { ssr: false, loading: SceneSkeleton },
);

/** If WebGL is unavailable, the same working screen is shown flat instead of in 3D. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function subscribeReducedMotion(notify: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

interface DeviceExperienceProps {
  /** The elder's name when signed in to a family; null in the public demo. */
  elderName: string | null;
  initialReadings: StoredReading[];
}

export function DeviceExperience({ elderName, initialReadings }: DeviceExperienceProps) {
  const signedIn = elderName !== null;
  const [state, dispatch] = useReducer(deviceReducer, INITIAL_DEVICE_STATE);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState(initialReadings);
  const [clock, setClock] = useState("");
  const [inside, setInside] = useState(false);
  const [wide, setWide] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [error, setError] = useState("");
  const [unclear, setUnclear] = useState(false);
  const [saving, startSaving] = useTransition();
  const startedAt = useRef(0);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  const { screen, kind, reading } = state;
  const intent = primaryIntent(screen);
  const powered = screen !== "off";

  const save = useCallback(() => {
    if (!reading) return;
    setError("");
    if (!signedIn) {
      setHistory((list) => [
        { ...reading, id: crypto.randomUUID(), taken_at: new Date().toISOString() },
        ...list,
      ]);
      dispatch({ type: "save" });
      return;
    }
    startSaving(async () => {
      const result = await saveReadingAction(reading);
      if (result.ok && result.reading) {
        const saved = result.reading;
        setHistory((list) => [saved, ...list]);
        dispatch({ type: "save" });
      } else {
        setError(result.message);
      }
    });
  }, [reading, signedIn]);

  const handlePrimary = useCallback(() => {
    if (intent === "start" && kind) {
      const lastWeight = latestByKind(history).weight;
      startedAt.current = performance.now();
      setProgress(0);
      setError("");
      dispatch({
        type: "start",
        reading: simulateReading(
          kind,
          Math.random,
          lastWeight?.kind === "weight" ? lastWeight.weight_kg : undefined,
        ),
      });
    } else if (intent === "save") {
      if (!saving) save();
    } else if (intent === "stop" || intent === "done") {
      dispatch({ type: "back" });
    }
  }, [intent, kind, history, save, saving]);

  const handleAction = useCallback((action: DeviceAction) => {
    setError("");
    dispatch(action);
  }, []);

  const handleHeard = useCallback(
    (transcript: string) => {
      const command = parseVoiceCommand(transcript);
      setUnclear(command === null);
      if (!command) return;
      if (command.type === "select") dispatch(command);
      else if (command.type === "history") dispatch({ type: "history" });
      else if (command.type === "back") dispatch({ type: "back" });
      else if (command.type === intent) handlePrimary();
    },
    [intent, handlePrimary],
  );
  const { language } = useVoicePreferences();
  const mic = useListening(handleHeard);
  const { speak, stop: silence } = useSpeech("device");

  // Leaving the page stops the device talking.
  useEffect(() => stopSpeaking, []);

  // Start-up animation.
  useEffect(() => {
    if (screen !== "boot") return;
    const timer = setTimeout(() => dispatch({ type: "booted" }), BOOT_MS);
    return () => clearTimeout(timer);
  }, [screen]);

  // The measurement itself: advance until done, then show the result.
  useEffect(() => {
    if (screen !== "measuring" || !kind) return;
    const duration = MEASURE_MS[kind];
    const timer = setInterval(() => {
      const elapsed = (performance.now() - startedAt.current) / duration;
      setProgress(Math.min(1, elapsed));
      if (elapsed >= 1) dispatch({ type: "complete" });
    }, 80);
    return () => clearInterval(timer);
  }, [screen, kind]);

  // Clock in the corner of the screen.
  useEffect(() => {
    const format = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });
    const tick = () => setClock(format.format(new Date()));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 20_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  // The device speaks each step, like a helper sitting beside the person.
  useEffect(() => {
    if (voiceOn) speak(spokenPrompt(state, signedIn, language));
    else silence();
  }, [state, signedIn, voiceOn, language, speak, silence]);

  const view: DeviceView = inside
    ? "inside"
    : wide || screen === "off"
      ? "whole"
      : screen === "measuring"
        ? "measure"
        : "screen";

  const lcd = (
    <DeviceScreen
      state={state}
      progress={progress}
      clock={clock}
      history={history}
      elderName={elderName}
      saving={saving}
      voice={{ canListen: mic.canListen, listening: mic.listening, heard: mic.interim || mic.heard }}
      onAction={handleAction}
      onPrimary={handlePrimary}
      onListen={mic.toggle}
    />
  );

  const flatFallback = (
    <div className="flex h-full items-center justify-center overflow-auto p-4">
      <div
        className="rounded-[28px] bg-[#090c0b] p-3"
        style={{ width: SCREEN_WIDTH + 24, height: SCREEN_HEIGHT + 24, zoom: "min(1, calc((100vw - 4.5rem) / 544px))" }}
      >
        {lcd}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Tend Home Station, interactive 3D model. Drag to turn it."
        className="relative isolate h-[clamp(26rem,66vh,40rem)] touch-pan-y overflow-hidden rounded-2xl border-2 border-border bg-[radial-gradient(ellipse_at_50%_35%,#ffffff_0%,#e6ede8_55%,#cfdbd3_100%)]"
      >
        <SceneBoundary fallback={flatFallback}>
          <DeviceScene
            view={view}
            activeKind={screen === "prepare" || screen === "measuring" ? kind : null}
            measuring={screen === "measuring"}
            progress={progress}
            powered={powered}
            primaryLit={intent !== null}
            reducedMotion={reducedMotion}
            onPower={() => handleAction({ type: "power" })}
            onBack={() => handleAction({ type: "back" })}
            onPrimary={handlePrimary}
          >
            {lcd}
          </DeviceScene>
        </SceneBoundary>
        {!powered && !inside ? (
          <p className="pointer-events-none absolute inset-x-0 top-4 text-center text-lg font-bold">
            Press <span className="rounded-full bg-amber px-2.5 py-0.5">Power</span> to turn the device on
          </p>
        ) : null}
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-card p-4">
        <p role="status" aria-live="polite" className="text-lg font-bold">
          {statusLine(state, progress)}
        </p>
        {error ? (
          <p role="alert" className="rounded-xl bg-alarm-soft px-4 py-2 font-bold text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2.5">
          <Button
            type="button"
            variant={powered ? "outline" : "amber"}
            aria-pressed={powered}
            onClick={() => handleAction({ type: "power" })}
          >
            <Power aria-hidden="true" />
            {powered ? "Turn off" : "Power on"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!powered || screen === "boot" || screen === "menu"}
            onClick={() => handleAction({ type: "back" })}
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
          <Button type="button" disabled={intent === null || saving} onClick={handlePrimary}>
            {intent ? PRIMARY_LABELS[intent] : "Start"}
          </Button>
          <span aria-hidden="true" className="mx-1 hidden w-0.5 self-stretch bg-border sm:block" />
          <Button type="button" variant="quiet" aria-pressed={inside} onClick={() => setInside((value) => !value)}>
            <Layers aria-hidden="true" />
            {inside ? "Close the device" : "Show inside"}
          </Button>
          <Button
            type="button"
            variant="quiet"
            aria-pressed={wide}
            disabled={inside || !powered}
            onClick={() => setWide((value) => !value)}
          >
            {wide ? <ZoomIn aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
            {wide ? "Zoom to screen" : "See whole device"}
          </Button>
          <Button type="button" variant="quiet" aria-pressed={voiceOn} onClick={() => setVoiceOn((value) => !value)}>
            {voiceOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
            {voiceOn ? "Voice on" : "Voice off"}
          </Button>
        </div>
        <div className="flex flex-col gap-3 border-t-2 border-border pt-3">
          <div className="flex flex-wrap items-center gap-3">
            {mic.canListen ? (
              <MicButton listening={mic.listening} onToggle={mic.toggle} disabled={!powered || screen === "boot"} label="Speak to the device" />
            ) : null}
            <LanguageSelect />
          </div>
          <p role="status" aria-live="polite" lang={mic.listening || mic.heard ? language : undefined} className="min-h-7 text-lg">
            {mic.listening ? (
              <>
                <span className="font-bold">Listening… </span>
                {mic.interim}
              </>
            ) : mic.error ? (
              <span className="font-bold text-destructive">{mic.error}</span>
            ) : mic.heard ? (
              <>
                Heard: “{mic.heard}”.
                {unclear ? " I did not understand that. Try again, or use the buttons." : ""}
              </>
            ) : mic.canListen ? (
              <span className="text-muted-foreground">
                Say what to measure, then “start”. A reading is only saved after you say “yes” or press Save.
              </span>
            ) : (
              <span className="text-muted-foreground">
                This browser cannot listen. The device still speaks each step; use the buttons.
              </span>
            )}
          </p>
        </div>
        <p className="text-muted-foreground">
          {signedIn ? (
            <>
              Saved readings go to {elderName}&apos;s family.{" "}
              <Link href="/circle/health" className="font-bold text-primary underline underline-offset-4">
                See them under Health
              </Link>
              .
            </>
          ) : (
            <>
              You are trying the demo, so readings are not stored.{" "}
              <Link href="/join" className="font-bold text-primary underline underline-offset-4">
                Join a family
              </Link>{" "}
              to share them with family.
            </>
          )}
        </p>
      </div>

      {inside ? <InsidePanel /> : null}

      {!inside ? (
        <button
          type="button"
          onClick={() => setInside(true)}
          className={buttonVariants({ variant: "outline", className: "self-start" })}
        >
          <Layers aria-hidden="true" />
          What is it made of?
        </button>
      ) : null}
    </div>
  );
}
