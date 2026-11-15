"use client";

import { createContext, useContext, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  PresentationControls,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@/components/device/device-screen";
import { DEVICE_PARTS } from "@/lib/device/parts";
import { cuffPressure, type ReadingKind } from "@/lib/device/readings";

export type DeviceView = "whole" | "screen" | "measure" | "inside";

export interface DeviceSceneProps {
  view: DeviceView;
  /** The accessory in use (while preparing or measuring), if any. */
  activeKind: ReadingKind | null;
  measuring: boolean;
  progress: number;
  powered: boolean;
  primaryLit: boolean;
  reducedMotion: boolean;
  onPower: () => void;
  onBack: () => void;
  onPrimary: () => void;
  /** The LCD contents (plain HTML), placed on the screen glass. */
  children: ReactNode;
}

/* ---------- Shape of the main unit: a rounded cylinder with a sloped top ---------- */

const BODY_HEIGHT = 1.35;
const SLOPE = 0.444; // front is lower than the back, so the screen faces a seated person
const TILT = Math.atan(BODY_HEIGHT * SLOPE);
const SHELL_LIFT = 2.15;
const SCREEN_WORLD_WIDTH = 1.15;
const HTML_UNITS_PER_PIXEL = 1 / 40; // drei's `Html transform` default
/**
 * drei centres transformed Html with `translate(-50%, -50%)` around its own box, then magnifies
 * the result ~170x. At fractional browser zoom the box size rounds and the LCD drifts off the
 * glass. Centring with fixed offsets instead leaves drei's wrapper zero-sized, so nothing rounds.
 */
const LCD_STYLE = {
  position: "absolute",
  left: -SCREEN_WIDTH / 2,
  top: -SCREEN_HEIGHT / 2,
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
} as const;

function arc(cx: number, cy: number, radius: number, from: number, to: number, steps = 10) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = from + ((to - from) * index) / steps;
    return new THREE.Vector2(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  });
}

/** Spins a profile into a solid, then slopes it: height shrinks towards the front (+z). */
function slopedLathe(profile: THREE.Vector2[]): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry(profile, 96, Math.PI);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    position.setY(index, position.getY(index) * (1 - SLOPE * position.getZ(index)));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function bodyGeometry() {
  const bottom = 0.12;
  const top = 0.2;
  return slopedLathe([
    new THREE.Vector2(0, 0),
    ...arc(1 - bottom, bottom, bottom, -Math.PI / 2, 0),
    ...arc(1 - top, BODY_HEIGHT - top, top, 0, Math.PI / 2),
    new THREE.Vector2(0, BODY_HEIGHT),
  ]);
}

function bandGeometry() {
  const skin = 0.008;
  return slopedLathe([
    ...arc(0.88, 0.12, 0.12 + skin, -Math.PI / 3, 0),
    new THREE.Vector2(1 + skin, 0.5),
    new THREE.Vector2(1, 0.512),
  ]);
}

function sleeveGeometry() {
  return new THREE.LatheGeometry(
    [
      ...arc(0.4, 0.06, 0.06, Math.PI, 1.5 * Math.PI, 5),
      ...arc(0.4, 0.06, 0.06, -Math.PI / 2, 0, 5),
      ...arc(0.4, 0.8, 0.06, 0, Math.PI / 2, 5),
      ...arc(0.4, 0.8, 0.06, Math.PI / 2, Math.PI, 5),
      new THREE.Vector2(0.34, 0.06),
    ],
    64,
  );
}

/** A tiny tiling weave, used for the speaker band and the cuff. */
function weaveTexture(repeatX: number, repeatY: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 32, 32);
    context.fillStyle = "#8c8c8c";
    for (const [x, y] of [[8, 8], [24, 24]]) {
      context.beginPath();
      context.ellipse(x, y, 6, 6, 0, 0, Math.PI * 2);
      context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type Glyph = "power" | "back" | "start";

/** Paints the symbol on top of a physical button. */
function glyphTexture(glyph: Glyph, background: string, ink: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = background;
    context.fillRect(0, 0, 128, 128);
    context.strokeStyle = context.fillStyle = ink;
    context.lineWidth = 11;
    context.lineCap = context.lineJoin = "round";
    context.beginPath();
    if (glyph === "power") {
      context.arc(64, 68, 27, -Math.PI / 3, (4 * Math.PI) / 3);
      context.moveTo(64, 30);
      context.lineTo(64, 64);
      context.stroke();
    } else if (glyph === "back") {
      context.moveTo(74, 36);
      context.lineTo(46, 64);
      context.lineTo(74, 92);
      context.stroke();
    } else {
      context.moveTo(50, 34);
      context.lineTo(94, 64);
      context.lineTo(50, 94);
      context.closePath();
      context.fill();
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.center.set(0.5, 0.5);
  texture.rotation = Math.PI / 2;
  return texture;
}

/* ---------- Camera ---------- */

const FOV = 35;
const FOV_FACTOR = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2));

interface Pose {
  target: THREE.Vector3;
  direction: THREE.Vector3;
  width: number;
  height: number;
}

const pose = (target: [number, number, number], direction: [number, number, number], width: number, height: number): Pose => ({
  target: new THREE.Vector3(...target),
  direction: new THREE.Vector3(...direction).normalize(),
  width,
  height,
});

const POSES: Record<Exclude<DeviceView, "measure">, Pose> = {
  whole: pose([0.05, 0.6, 0.1], [0, 0.55, 0.83], 6.9, 3.5),
  screen: pose([0, 1.3, 0.05], [0, 0.68, 0.73], 1.42, 1.58),
  inside: pose([0.1, 1.95, 0], [0, 0.3, 0.95], 5.6, 4.7),
};
const MEASURE_POSES: Record<ReadingKind, Pose> = {
  bp: pose([-1.1, 0.65, 0.3], [0, 0.6, 0.8], 4.5, 2.9),
  spo2: pose([0.75, 0.65, 0.45], [0, 0.6, 0.8], 4.1, 2.9),
  temp: pose([0.35, 0.95, 0], [0, 0.55, 0.83], 3.4, 3),
  weight: pose([1.1, 0.6, -0.2], [0, 0.6, 0.8], 5.2, 3.1),
};
const desiredPosition = new THREE.Vector3();

/** Eases the camera to frame whatever matters right now, at any aspect ratio. */
function CameraRig({ view, activeKind, instant }: { view: DeviceView; activeKind: ReadingKind | null; instant: boolean }) {
  const lookAt = useRef<THREE.Vector3 | null>(null);
  useFrame(({ camera, size }, delta) => {
    const aspect = size.width / Math.max(1, size.height);
    // On a tall phone screen, stay close so the numbers remain readable while measuring.
    const next =
      view !== "measure" ? POSES[view] : aspect < 0.9 ? POSES.screen : MEASURE_POSES[activeKind ?? "bp"];
    const distance = Math.max(next.height / FOV_FACTOR, next.width / (FOV_FACTOR * aspect));
    desiredPosition.copy(next.direction).multiplyScalar(distance).add(next.target);
    const first = lookAt.current === null;
    lookAt.current ??= next.target.clone();
    const ease = instant || first ? 1 : 1 - Math.exp(-3.2 * delta);
    camera.position.lerp(desiredPosition, ease);
    lookAt.current.lerp(next.target, ease);
    camera.lookAt(lookAt.current);
  });
  return null;
}

/* ---------- Small pieces ---------- */

const WHITE = "#f3f4f1";

/**
 * Labels and the LCD are HTML laid over the canvas. They mount into one fixed
 * overlay element, which is known before the first frame is drawn.
 */
const OverlayContext = createContext<RefObject<HTMLElement> | undefined>(undefined);

function Tag({ id, text, numbered, visible = true }: { id: string; text: string; numbered: boolean; visible?: boolean }) {
  const number = DEVICE_PARTS.findIndex((part) => part.id === id) + 1;
  const overlay = useContext(OverlayContext);
  return (
    <Html center zIndexRange={[20, 0]} pointerEvents="none" portal={overlay}>
      <span hidden={!visible} className="flex items-center gap-1.5 rounded-full border border-border bg-card/95 py-0.5 pl-0.5 pr-2.5 text-[13px] font-bold whitespace-nowrap text-foreground shadow-sm">
        {numbered ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[12px] text-primary-foreground">
            {number}
          </span>
        ) : (
          <span className="w-1" />
        )}
        {text}
      </span>
    </Html>
  );
}

interface BodyButtonProps {
  x: number;
  radius: number;
  glyph: Glyph;
  color: string;
  ink: string;
  onPress: () => void;
  lit?: boolean;
  pulse?: boolean;
}

/** Shows a hand cursor over the physical buttons (the canvas is the event target). */
function setCursor(event: ThreeEvent<PointerEvent>, cursor: string) {
  const target = event.nativeEvent.target;
  if (target instanceof HTMLElement) target.style.cursor = cursor;
}

function BodyButton({ x, radius, glyph, color, ink, onPress, lit = false, pulse = false }: BodyButtonProps) {
  const cap = useRef<THREE.Group>(null);
  const halo = useRef<THREE.MeshStandardMaterial>(null);
  const press = useRef(0);
  const texture = useMemo(() => glyphTexture(glyph, color, ink), [glyph, color, ink]);

  useFrame(({ clock }, delta) => {
    press.current = Math.max(0, press.current - delta * 5);
    if (cap.current) cap.current.position.y = 0.04 - 0.022 * press.current;
    if (halo.current) {
      const beat = pulse ? 0.6 + 0.4 * Math.sin(clock.elapsedTime * 5) : 1;
      halo.current.emissiveIntensity = lit ? 2.2 * beat : 0;
    }
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    press.current = 1;
    onPress();
  };

  return (
    <group position={[x, 0, 0.62]}>
      <mesh position={[0, 0.006, 0]}>
        <cylinderGeometry args={[radius + 0.03, radius + 0.03, 0.012, 48]} />
        <meshStandardMaterial ref={halo} color="#cfd6d1" emissive="#3fe39a" emissiveIntensity={0} roughness={0.4} />
      </mesh>
      <group ref={cap}>
        <mesh
          onClick={handleClick}
          onPointerOver={(event) => setCursor(event, "pointer")}
          onPointerOut={(event) => setCursor(event, "grab")}
        >
          <cylinderGeometry args={[radius, radius, 0.06, 48]} />
          <meshStandardMaterial attach="material-0" color={color} roughness={0.55} />
          <meshStandardMaterial attach="material-1" map={texture} roughness={0.55} />
          <meshStandardMaterial attach="material-2" color={color} />
        </mesh>
      </group>
    </group>
  );
}

function Tube({ points, radius, color }: { points: [number, number, number][]; radius: number; color: string }) {
  const geometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))),
        64,
        radius,
        10,
      ),
    [points, radius],
  );
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

const AIR_TUBE: [number, number, number][] = [
  [-0.99, 0.22, 0.3],
  [-1.22, 0.1, 0.48],
  [-1.5, 0.035, 0.85],
  [-1.85, 0.035, 1.0],
  [-2.15, 0.1, 0.85],
  [-2.3, 0.3, 0.63],
];
const CLIP_CABLE: [number, number, number][] = [
  [0.86, 0.2, 0.55],
  [1.05, 0.06, 0.8],
  [1.2, 0.025, 1.25],
  [1.5, 0.025, 1.5],
  [1.82, 0.07, 1.33],
];

/* ---------- Accessories ---------- */

interface AccessoryProps {
  active: boolean;
  measuring: boolean;
  progress: number;
  showTag: boolean;
  numbered: boolean;
  still: boolean;
}

function Cuff({ active, measuring, progress, showTag, numbered, still }: AccessoryProps) {
  const sleeve = useRef<THREE.Group>(null);
  const geometry = useMemo(() => sleeveGeometry(), []);
  const weave = useMemo(() => weaveTexture(60, 18), []);
  const fill = useRef(0);
  useFrame(({ clock }, delta) => {
    const target = measuring ? cuffPressure(progress, 130, 80) / 160 : 0;
    fill.current = still ? target : THREE.MathUtils.damp(fill.current, target, 6, delta);
    const beat = measuring && progress > 0.4 && !still ? 0.006 * Math.sin(clock.elapsedTime * 7.5) : 0;
    const swell = 1 + 0.13 * fill.current + beat;
    sleeve.current?.scale.set(swell, 1, swell);
  });
  return (
    <group position={[-2.45, 0, 0.2]} rotation={[0, 0.5, 0]}>
      <group ref={sleeve}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#51606b" roughness={0.95} bumpMap={weave} bumpScale={0.6} />
        </mesh>
        <mesh position={[0, 0.43, 0.462]}>
          <boxGeometry args={[0.34, 0.3, 0.012]} />
          <meshStandardMaterial color="#e9ece8" roughness={0.8} />
        </mesh>
        <mesh position={[0.3, 0.43, 0.36]} rotation={[0, 0.7, 0]}>
          <boxGeometry args={[0.2, 0.7, 0.014]} />
          <meshStandardMaterial color="#39444c" roughness={1} />
        </mesh>
      </group>
      <group position={[0, 1.12, 0]}>
          <Tag id="cuff" text={active ? "Arm cuff (in use)" : "Arm cuff"} numbered={numbered} visible={showTag} />
        </group>
    </group>
  );
}

function FingerClip({ active, measuring, showTag, numbered, still }: AccessoryProps) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const jaw = useRef<THREE.Group>(null);
  const open = useRef(0.1);
  useFrame(({ clock }, delta) => {
    if (glow.current) {
      const beat = still ? 1 : 0.65 + 0.35 * Math.sin(clock.elapsedTime * 6.5);
      glow.current.emissiveIntensity = measuring ? 3 * beat : active ? 1.2 : 0;
    }
    open.current = still ? (active ? 0.3 : 0.1) : THREE.MathUtils.damp(open.current, active ? 0.3 : 0.1, 5, delta);
    if (jaw.current) jaw.current.rotation.x = -open.current;
  });
  return (
    <group position={[1.75, 0, 1.0]} rotation={[0, -0.45, 0]}>
      <RoundedBox args={[0.36, 0.11, 0.66]} radius={0.05} smoothness={4} position={[0, 0.06, 0]}>
        <meshStandardMaterial color={WHITE} roughness={0.45} />
      </RoundedBox>
      <mesh position={[0, 0.118, -0.08]}>
        <boxGeometry args={[0.2, 0.012, 0.3]} />
        <meshStandardMaterial ref={glow} color="#3a0d0d" emissive="#ff2a1f" emissiveIntensity={0} />
      </mesh>
      <group ref={jaw} position={[0, 0.13, 0.3]}>
        <RoundedBox args={[0.36, 0.11, 0.66]} radius={0.05} smoothness={4} position={[0, 0.06, -0.3]}>
          <meshStandardMaterial color="#2f8f78" roughness={0.45} />
        </RoundedBox>
        <mesh position={[0, 0.118, -0.36]}>
          <boxGeometry args={[0.22, 0.008, 0.26]} />
          <meshStandardMaterial color="#0c1210" roughness={0.2} />
        </mesh>
      </group>
      <group position={[0, 0.62, 0]}>
          <Tag id="oximeter" text={active ? "Finger clip (in use)" : "Finger clip"} numbered={numbered} visible={showTag} />
        </group>
    </group>
  );
}

function Thermometer({ active, measuring, showTag, numbered, still }: AccessoryProps) {
  const stick = useRef<THREE.Group>(null);
  const display = useRef<THREE.MeshStandardMaterial>(null);
  const lift = useRef(0);
  useFrame((_, delta) => {
    lift.current = still ? Number(active) : THREE.MathUtils.damp(lift.current, Number(active), 5, delta);
    if (stick.current) {
      stick.current.position.set(1.09 + 0.22 * lift.current, 0.78 + 0.42 * lift.current, -0.1);
      stick.current.rotation.z = -0.5 * lift.current;
    }
    if (display.current) display.current.emissiveIntensity = measuring ? 1.6 : active ? 0.6 : 0;
  });
  return (
    <>
      <RoundedBox args={[0.2, 0.36, 0.26]} radius={0.05} smoothness={4} position={[1.07, 0.5, -0.1]}>
        <meshStandardMaterial color="#e3e7e3" roughness={0.5} />
      </RoundedBox>
      <group ref={stick} position={[1.09, 0.78, -0.1]}>
        <mesh>
          <capsuleGeometry args={[0.05, 0.56, 6, 16]} />
          <meshStandardMaterial color={WHITE} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.36, 0]}>
          <cylinderGeometry args={[0.02, 0.014, 0.14, 12]} />
          <meshStandardMaterial color="#c9ced1" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.14, 0.047]}>
          <boxGeometry args={[0.06, 0.16, 0.012]} />
          <meshStandardMaterial ref={display} color="#16211c" emissive="#7ff0b8" emissiveIntensity={0} />
        </mesh>
        <group position={[0.1, 0.52, 0]}>
            <Tag id="thermometer" text={active ? "Thermometer (in use)" : "Thermometer"} numbered={numbered} visible={showTag} />
          </group>
      </group>
    </>
  );
}

function WeighingScale({ active, measuring, showTag, numbered }: AccessoryProps) {
  const display = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (display.current) display.current.emissiveIntensity = measuring ? 2 : active ? 0.8 : 0;
  });
  return (
    <group position={[2.3, 0, -0.75]} rotation={[0, -0.25, 0]}>
      <RoundedBox args={[1.45, 0.07, 1.45]} radius={0.03} smoothness={4} position={[0, 0.045, 0]}>
        <meshPhysicalMaterial color="#1c2623" roughness={0.12} clearcoat={1} />
      </RoundedBox>
      <mesh position={[0, 0.082, 0.45]}>
        <boxGeometry args={[0.42, 0.006, 0.16]} />
        <meshStandardMaterial ref={display} color="#0b1512" emissive="#7ff0b8" emissiveIntensity={0} />
      </mesh>
      <group position={[0, 0.5, 0]}>
          <Tag id="scale" text={active ? "Scale (in use)" : "Scale · optional, wireless"} numbered={numbered} visible={showTag} />
        </group>
    </group>
  );
}

/* ---------- What is inside the shell ---------- */

function Spread({
  amount,
  home,
  by,
  children,
}: {
  amount: RefObject<number>;
  home: [number, number, number];
  by: [number, number, number];
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = amount.current;
    group.current?.position.set(home[0] + by[0] * t, home[1] + by[1] * t, home[2] + by[2] * t);
  });
  return (
    <group ref={group} position={home}>
      {children}
    </group>
  );
}

function Internals({ amount, tagged }: { amount: RefObject<number>; tagged: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.04, 64]} />
        <meshStandardMaterial color="#2b332f" roughness={0.7} />
      </mesh>

      <Spread amount={amount} home={[0, 0.14, -0.2]} by={[0, 0, 0]}>
        <RoundedBox args={[0.74, 0.17, 0.44]} radius={0.04} smoothness={3}>
          <meshStandardMaterial color="#2f6fb5" roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, 0.087, 0]}>
          <boxGeometry args={[0.5, 0.004, 0.24]} />
          <meshStandardMaterial color="#f2b33d" roughness={0.6} />
        </mesh>
        <group position={[0.5, 0.14, 0.2]}>
            <Tag id="battery" text="Battery" numbered visible={tagged} />
          </group>
      </Spread>

      <Spread amount={amount} home={[0, 0.3, 0.52]} by={[0, 0.05, 0.62]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.27, 0.2, 0.14, 40]} />
          <meshStandardMaterial color="#1b1f1d" roughness={0.8} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.072]}>
          <torusGeometry args={[0.25, 0.022, 10, 40]} />
          <meshStandardMaterial color="#b9c0c4" metalness={0.9} roughness={0.3} />
        </mesh>
        <group position={[0, -0.02, 0.3]}>
            <Tag id="speaker" text="Speaker" numbered visible={tagged} />
          </group>
      </Spread>

      <Spread amount={amount} home={[0, 0.42, -0.1]} by={[0, 0.55, 0]}>
        <mesh>
          <boxGeometry args={[1.15, 0.03, 0.82]} />
          <meshStandardMaterial color="#1f6b45" roughness={0.55} />
        </mesh>
        <mesh position={[-0.3, 0.035, 0.1]}>
          <boxGeometry args={[0.24, 0.04, 0.34]} />
          <meshStandardMaterial color="#c3c9cc" metalness={0.85} roughness={0.35} />
        </mesh>
        <mesh position={[0.12, 0.03, 0.12]}>
          <boxGeometry args={[0.2, 0.03, 0.2]} />
          <meshStandardMaterial color="#111514" roughness={0.4} />
        </mesh>
        <mesh position={[0.4, 0.045, -0.22]}>
          <boxGeometry args={[0.13, 0.06, 0.13]} />
          <meshStandardMaterial color="#111514" roughness={0.4} />
        </mesh>
        <mesh position={[0.4, 0.1, -0.22]}>
          <cylinderGeometry args={[0.025, 0.025, 0.07, 12]} />
          <meshStandardMaterial color="#d8dcd9" roughness={0.4} />
        </mesh>
        <>
            <group position={[-0.72, 0.03, 0.42]}>
              <Tag id="board" text="Controller board" numbered visible={tagged} />
            </group>
            <group position={[0.78, 0.1, -0.2]}>
              <Tag id="sensor" text="Pressure sensor" numbered visible={tagged} />
            </group>
          </>
      </Spread>

      <Spread amount={amount} home={[-0.3, 0.62, -0.4]} by={[-0.4, 1.0, 0.25]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, 0.36, 28]} />
          <meshStandardMaterial color="#aeb5b9" metalness={0.85} roughness={0.35} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0.22, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.1, 28]} />
          <meshStandardMaterial color="#20262a" roughness={0.6} />
        </mesh>
        <group position={[-0.2, 0.27, 0]}>
            <Tag id="pump" text="Air pump" numbered visible={tagged} />
          </group>
      </Spread>

      <Spread amount={amount} home={[0.2, 0.6, -0.42]} by={[0.25, 1.1, 0.25]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.22, 20]} />
          <meshStandardMaterial color="#c79a3f" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <boxGeometry args={[0.2, 0.1, 0.16]} />
          <meshStandardMaterial color="#e7e9e4" roughness={0.6} />
        </mesh>
        <group position={[0.2, 0.25, 0]}>
            <Tag id="valve" text="Release valve" numbered visible={tagged} />
          </group>
      </Spread>

      <Spread amount={amount} home={[0.45, 0.5, 0.2]} by={[0.75, 0.95, 0]}>
        <mesh>
          <boxGeometry args={[0.16, 0.02, 0.12]} />
          <meshStandardMaterial color="#1f6b45" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.035, 16]} />
          <meshStandardMaterial color="#d9c27a" metalness={0.8} roughness={0.3} />
        </mesh>
        <group position={[0.2, 0.16, 0]}>
            <Tag id="mic" text="Microphone" numbered visible={tagged} />
          </group>
      </Spread>
    </group>
  );
}

/* ---------- The whole station ---------- */

function Station(props: DeviceSceneProps) {
  const { view, activeKind, measuring, progress, powered, primaryLit, reducedMotion } = props;
  const inside = view === "inside";
  const overlay = useContext(OverlayContext);
  const shell = useRef<THREE.Group>(null);
  const opened = useRef(0);
  const body = useMemo(() => bodyGeometry(), []);
  const band = useMemo(() => bandGeometry(), []);
  const weave = useMemo(() => weaveTexture(150, 26), []);

  useFrame((_, delta) => {
    opened.current = reducedMotion
      ? Number(inside)
      : THREE.MathUtils.damp(opened.current, Number(inside), 3.5, delta);
    if (shell.current) shell.current.position.y = SHELL_LIFT * opened.current;
  });

  const showTags = view !== "screen";
  const accessory = (kind: ReadingKind): AccessoryProps => ({
    active: activeKind === kind,
    measuring: measuring && activeKind === kind,
    progress,
    showTag: showTags,
    numbered: inside,
    still: reducedMotion,
  });

  return (
    <group>
      <Internals amount={opened} tagged={inside} />

      <group ref={shell}>
        <mesh geometry={body}>
          <meshPhysicalMaterial color={WHITE} roughness={0.42} clearcoat={0.3} clearcoatRoughness={0.55} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={band}>
          <meshStandardMaterial color="#a4ada7" roughness={1} map={weave} bumpMap={weave} bumpScale={0.8} />
        </mesh>

        {/* Air port (cuff) and cable port (finger clip). */}
        <mesh position={[-0.985, 0.235, 0.3]} rotation={[0, 0.29, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.07, 20]} />
          <meshStandardMaterial color="#7d8782" roughness={0.5} />
        </mesh>
        <mesh position={[0.855, 0.215, 0.545]} rotation={[0, -0.57, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 20]} />
          <meshStandardMaterial color="#7d8782" roughness={0.5} />
        </mesh>

        <Thermometer {...accessory("temp")} />

        {/* Sloped top face: screen glass and the three buttons. */}
        <group position={[0, BODY_HEIGHT + 0.001, 0]} rotation={[TILT, 0, 0]}>
          <RoundedBox args={[1.27, 0.03, 0.985]} radius={0.014} smoothness={4} position={[0, 0.012, -0.2]}>
            {/* Exactly the LCD background, so glass and picture read as one panel. */}
            <meshBasicMaterial color="#07110d" toneMapped={false} />
          </RoundedBox>
          <Html
            transform
            position={[0, 0.03, -0.2]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={SCREEN_WORLD_WIDTH / (SCREEN_WIDTH * HTML_UNITS_PER_PIXEL)}
            zIndexRange={[10, 0]}
            portal={overlay}
            style={LCD_STYLE}
          >
            {props.children}
          </Html>
          <BodyButton x={-0.4} radius={0.105} glyph="back" color="#e6e9e5" ink="#1c2a24" onPress={props.onBack} />
          <BodyButton
            x={0}
            radius={0.15}
            glyph="start"
            color="#1f8a5f"
            ink="#ffffff"
            onPress={props.onPrimary}
            lit={primaryLit}
            pulse={measuring && !reducedMotion}
          />
          <BodyButton
            x={0.4}
            radius={0.105}
            glyph="power"
            color={powered ? "#e6e9e5" : "#f2b33d"}
            ink="#1c2a24"
            onPress={props.onPower}
          />
          <>
              <group position={[-0.72, 0.1, -0.62]}>
                <Tag id="lcd" text="Screen" numbered visible={inside} />
              </group>
              <group position={[0.62, 0.1, 0.78]}>
                <Tag id="buttons" text="Buttons" numbered visible={inside} />
              </group>
          </>
        </group>
        <group position={[-1.05, 0.55, 0.45]}>
            <Tag id="shell" text="Outer shell" numbered visible={inside} />
          </group>
      </group>

      <Tube points={AIR_TUBE} radius={0.03} color="#b6beba" />
      <Tube points={CLIP_CABLE} radius={0.016} color="#d5dad6" />
      <Cuff {...accessory("bp")} />
      <FingerClip {...accessory("spo2")} />
      <WeighingScale {...accessory("weight")} />
    </group>
  );
}

/** The interactive 3D Home Station. Loaded only in the browser. */
export function DeviceScene(props: DeviceSceneProps) {
  const overlay = useRef<HTMLDivElement>(null);
  return (
    <OverlayContext value={overlay as RefObject<HTMLElement>}>
      <Canvas
      dpr={[1, 2]}
      camera={{ fov: FOV, position: [0, 4.5, 8], near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true }}
      style={{ touchAction: "pan-y" }}
      aria-hidden="true"
    >
      <CameraRig view={props.view} activeKind={props.activeKind} instant={props.reducedMotion} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3.5, 6, 5]} intensity={1.5} />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} />
      <Environment resolution={256} environmentIntensity={0.75}>
        <color attach="background" args={["#aab4ae"]} />
        <Lightformer intensity={2} position={[0, 6, -1]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer intensity={1.1} position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer intensity={0.9} position={[6, 2, 3]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
      </Environment>
      <PresentationControls
        global
        cursor
        snap
        enabled={!props.reducedMotion}
        speed={1.2}
        polar={[-0.12, 0.22]}
        azimuth={[-0.75, 0.75]}
      >
        <Station {...props} />
      </PresentationControls>
      <ContactShadows position={[0, 0.002, 0]} scale={14} blur={2.6} far={3} opacity={0.42} resolution={512} />
      </Canvas>
      <div ref={overlay} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </OverlayContext>
  );
}
