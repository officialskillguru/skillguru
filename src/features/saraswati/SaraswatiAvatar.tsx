import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mouthOpenFromVolume, type SaraswatiState } from "./saraswati-state";

/** Drop the supplied realistic avatar here (public/avatars/saraswati.glb). */
export const SARASWATI_AVATAR_URL = "/avatars/saraswati.glb";

// Morph-target names used by common realistic avatar pipelines (ARKit / Ready
// Player Me / Oculus visemes / CC4). The first match on each mesh is driven.
const MOUTH_MORPHS = ["jawOpen", "mouthOpen", "viseme_aa", "viseme_AA", "Mouth_Open", "MouthOpen", "V_Open"];
const BLINK_MORPHS = ["eyeBlinkLeft", "eyeBlinkRight", "eyesClosed", "Eye_Blink_L", "Eye_Blink_R", "blink", "Blink"];
const SMILE_MORPHS = ["mouthSmileLeft", "mouthSmileRight", "mouthSmile", "Mouth_Smile_L", "Mouth_Smile_R"];
const BROW_UP_MORPHS = ["browInnerUp", "Brow_Raise_Inner_L", "Brow_Raise_Inner_R"];

type Getter = () => number;

interface MotionTargets {
  yaw: number;
  pitch: number;
  roll: number;
  sway: number;
  smile: number;
  brow: number;
}

function targetsFor(state: SaraswatiState, t: number, mouth: number, reducedMotion: boolean): MotionTargets {
  const m = reducedMotion ? 0 : 1;
  switch (state) {
    case "listening":
      // Attentive: slight lean-in and head tilt, small acknowledging micro-nods.
      return { yaw: Math.sin(t * 0.5) * 0.03 * m, pitch: 0.06 + Math.sin(t * 1.3) * 0.012 * m, roll: 0.09, sway: 0.4, smile: 0.25, brow: 0.15 };
    case "thinking":
      // Gaze up and to the side, slower sway, raised inner brow.
      return { yaw: 0.2 + Math.sin(t * 0.35) * 0.04 * m, pitch: -0.12, roll: -0.05, sway: 0.3, smile: 0.05, brow: 0.55 };
    case "speaking":
      // Emphasis nods that follow the loudness of the speech.
      return { yaw: Math.sin(t * 0.9) * 0.06 * m, pitch: (Math.sin(t * 4.2) * 0.035 * mouth + 0.02) * (m || 0.3), roll: Math.sin(t * 0.7) * 0.03 * m, sway: 0.7, smile: 0.3, brow: 0.2 + mouth * 0.25 };
    case "connecting":
      return { yaw: 0, pitch: 0.02, roll: 0, sway: 0.5, smile: 0.2, brow: 0.3 };
    case "error":
      return { yaw: 0, pitch: 0.08, roll: 0, sway: 0.3, smile: 0, brow: 0.4 };
    case "idle":
    default:
      return { yaw: Math.sin(t * 0.4) * 0.07 * m, pitch: Math.sin(t * 0.3) * 0.02 * m, roll: 0, sway: 1, smile: 0.2, brow: 0 };
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return Boolean(reduced);
}

/** Shared per-frame driver: blink timing, smoothed mouth, damped head pose. */
function useAvatarDriver(state: SaraswatiState, getOutputVolume: Getter, reducedMotion: boolean) {
  const pose = useRef({ yaw: 0, pitch: 0, roll: 0, smile: 0, brow: 0, mouth: 0, blink: 0, breathe: 0 });
  const nextBlink = useRef(2.5);
  const blinkStart = useRef(-1);

  return (t: number, delta: number) => {
    const p = pose.current;
    const volume = state === "speaking" ? getOutputVolume() : 0;
    p.mouth = mouthOpenFromVolume(volume, p.mouth, delta);

    const tg = targetsFor(state, t, p.mouth, reducedMotion);
    const d = (cur: number, to: number, lambda = 4) => THREE.MathUtils.damp(cur, to, lambda, delta);
    p.yaw = d(p.yaw, tg.yaw);
    p.pitch = d(p.pitch, tg.pitch);
    p.roll = d(p.roll, tg.roll, 3);
    p.smile = d(p.smile, tg.smile, 3);
    p.brow = d(p.brow, tg.brow, 3);
    p.breathe = reducedMotion ? 0 : Math.sin(t * 1.6) * tg.sway;

    if (t >= nextBlink.current && blinkStart.current < 0) blinkStart.current = t;
    if (blinkStart.current >= 0) {
      const k = (t - blinkStart.current) / 0.16;
      p.blink = k < 1 ? Math.sin(k * Math.PI) : 0;
      if (k >= 1) {
        blinkStart.current = -1;
        nextBlink.current = t + 2.5 + Math.random() * 3.5;
      }
    }
    return p;
  };
}

// ---------------------------------------------------------------------------
// Realistic GLB avatar
// ---------------------------------------------------------------------------

interface MorphBinding {
  mesh: THREE.Mesh;
  mouth: number[];
  blink: number[];
  smile: number[];
  brow: number[];
}

function indicesFor(dict: Record<string, number>, names: string[], all = false): number[] {
  const found = names.filter((n) => n in dict).map((n) => dict[n]!);
  return all ? found : found.slice(0, 1);
}

interface Rig {
  morphs: MorphBinding[];
  head: THREE.Bone | null;
  neck: THREE.Bone | null;
  jaw: THREE.Bone | null;
  spine: THREE.Bone | null;
  base: { head: THREE.Euler | null; neck: THREE.Euler | null; jaw: THREE.Euler | null; spine: THREE.Euler | null };
}

/** Walks the loaded scene once and records what can be animated. Three.js objects are mutable by design. */
function buildRig(scene: THREE.Object3D): Rig {
  const rig: Rig = { morphs: [], head: null, neck: null, jaw: null, spine: null, base: { head: null, neck: null, jaw: null, spine: null } };
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.frustumCulled = false;
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        const dict = mesh.morphTargetDictionary;
        const b = { mesh, mouth: indicesFor(dict, MOUTH_MORPHS), blink: indicesFor(dict, BLINK_MORPHS, true), smile: indicesFor(dict, SMILE_MORPHS, true), brow: indicesFor(dict, BROW_UP_MORPHS, true) };
        if (b.mouth.length || b.blink.length) rig.morphs.push(b);
      }
    }
    const bone = o as THREE.Bone;
    if (bone.isBone) {
      const n = bone.name.toLowerCase();
      // "Head" / "mixamorig:Head" / "CC_Base_Head" — but not "HeadTop_End".
      if (!rig.head && n.endsWith("head") && !n.includes("top")) rig.head = bone;
      if (!rig.neck && n.includes("neck")) rig.neck = bone;
      if (!rig.jaw && n.includes("jaw")) rig.jaw = bone;
      if (!rig.spine && /spine2|spine1|chest|upperchest/.test(n)) rig.spine = bone;
    }
  });
  rig.base = {
    head: rig.head?.rotation.clone() ?? null,
    neck: rig.neck?.rotation.clone() ?? null,
    jaw: rig.jaw?.rotation.clone() ?? null,
    spine: rig.spine?.rotation.clone() ?? null,
  };
  return rig;
}

function GlbAvatar({ url, state, getOutputVolume, reducedMotion }: { url: string; state: SaraswatiState; getOutputVolume: Getter; reducedMotion: boolean }) {
  const { scene, animations } = useGLTF(url);
  // fit: scales/centres the model; sway: fallback head motion when the GLB has no head bone.
  const fit = useRef<THREE.Group>(null);
  const sway = useRef<THREE.Group>(null);
  const rigRef = useRef<Rig | null>(null);
  const { actions, names } = useAnimations(animations, sway);
  const camera = useThree((s) => s.camera);
  const drive = useAvatarDriver(state, getOutputVolume, reducedMotion);

  // Build the rig and frame the face once the scene is mounted.
  useEffect(() => {
    const group = fit.current;
    if (!group) return;
    const rig = buildRig(scene);
    rigRef.current = rig;

    group.scale.setScalar(1);
    group.position.set(0, 0, 0);
    group.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
    group.scale.setScalar(size.y > 0 ? 1.75 / size.y : 1);
    group.updateMatrixWorld(true);
    const scaled = new THREE.Box3().setFromObject(scene);
    const center = scaled.getCenter(new THREE.Vector3());
    group.position.set(-center.x, -scaled.min.y, -center.z);
    group.updateMatrixWorld(true);

    const focus = new THREE.Vector3();
    if (rig.head) rig.head.getWorldPosition(focus);
    else focus.set(0, 1.75 * 0.92, 0);
    camera.position.set(focus.x, focus.y + 0.02, focus.z + 0.85);
    camera.lookAt(focus.x, focus.y - 0.02, focus.z);
  }, [scene, camera]);

  // Prefer authored clips when the GLB ships them; procedural motion layers on top.
  useEffect(() => {
    if (reducedMotion) return;
    const pick = (keys: string[]) => names.find((n) => keys.some((k) => n.toLowerCase().includes(k)));
    const clip =
      (state === "speaking" && pick(["talk", "speak"])) ||
      (state === "listening" && pick(["listen"])) ||
      (state === "thinking" && pick(["think"])) ||
      pick(["idle", "breath"]);
    if (!clip) return;
    const action = actions[clip];
    action?.reset().fadeIn(0.4).play();
    return () => {
      action?.fadeOut(0.4);
    };
  }, [state, actions, names, reducedMotion]);

  useFrame(({ clock }, delta) => {
    const rig = rigRef.current;
    if (!rig) return;
    const p = drive(clock.elapsedTime, delta);
    // Three.js morph influences are imperative per-frame state owned by the
    // loaded scene graph, not React state — mutating them here is the intended API.
    /* eslint-disable react-hooks/immutability */
    for (const b of rig.morphs) {
      const inf = b.mesh.morphTargetInfluences;
      if (!inf) continue;
      for (const i of b.mouth) inf[i] = p.mouth * 0.85;
      for (const i of b.blink) inf[i] = p.blink;
      for (const i of b.smile) inf[i] = p.smile * 0.5;
      for (const i of b.brow) inf[i] = p.brow * 0.6;
    }
    /* eslint-enable react-hooks/immutability */
    // Jaw bone only when there is no mouth morph, so the two never fight.
    if (rig.jaw && rig.base.jaw && rig.morphs.every((b) => b.mouth.length === 0)) rig.jaw.rotation.x = rig.base.jaw.x + p.mouth * 0.22;
    const target = rig.head ?? rig.neck;
    const base = rig.head ? rig.base.head : rig.base.neck;
    if (target && base) target.rotation.set(base.x + p.pitch, base.y + p.yaw, base.z + p.roll);
    else sway.current?.rotation.set(p.pitch * 0.3, p.yaw * 0.5, p.roll * 0.3);
    if (rig.spine && rig.base.spine) rig.spine.rotation.x = rig.base.spine.x + p.breathe * 0.012;
  });

  return (
    <group ref={fit}>
      <group ref={sway}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Stylised stand-in (used only until the realistic GLB is present)
// ---------------------------------------------------------------------------

function StandInAvatar({ state, getOutputVolume, reducedMotion }: { state: SaraswatiState; getOutputVolume: Getter; reducedMotion: boolean }) {
  const head = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const eyes = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const brows = useRef<THREE.Group>(null);
  const drive = useAvatarDriver(state, getOutputVolume, reducedMotion);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 1.47, 1.55);
    camera.lookAt(0, 1.4, 0);
  }, [camera]);

  useFrame(({ clock }, delta) => {
    const p = drive(clock.elapsedTime, delta);
    if (head.current) head.current.rotation.set(p.pitch, p.yaw, p.roll);
    if (body.current) body.current.scale.y = 1 + p.breathe * 0.012;
    if (mouth.current) {
      mouth.current.scale.y = 0.12 + p.mouth * 0.9;
      mouth.current.scale.x = 1 - p.mouth * 0.25 + p.smile * 0.15;
    }
    if (eyes.current) eyes.current.scale.y = Math.max(0.08, 1 - p.blink);
    if (brows.current) brows.current.position.y = 0.105 + p.brow * 0.02;
    if (halo.current) {
      const mat = halo.current.material as THREE.MeshBasicMaterial;
      const glow = reducedMotion ? 0.3 : state === "speaking" ? 0.35 + p.mouth * 0.5 : state === "thinking" ? 0.3 + Math.sin(clock.elapsedTime * 3) * 0.15 : state === "listening" ? 0.4 : 0.22;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, glow, 6, delta);
    }
  });

  const skin = "#c98d6b";
  return (
    <group>
      <mesh ref={halo} position={[0, 1.52, -0.25]}>
        <ringGeometry args={[0.3, 0.34, 64]} />
        <meshBasicMaterial color="#f5c542" transparent opacity={0.25} />
      </mesh>
      <group ref={body}>
        <mesh position={[0, 1.08, 0]} scale={[1, 0.55, 0.6]}>
          <sphereGeometry args={[0.32, 48, 32]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.7} />
        </mesh>
        {/* Saree pallu draped over one shoulder, with a gold border. */}
        <mesh position={[0.07, 1.1, 0.16]} rotation={[0.15, 0, 0.55]}>
          <boxGeometry args={[0.11, 0.52, 0.02]} />
          <meshStandardMaterial color="#a3192e" roughness={0.6} />
        </mesh>
        <mesh position={[0.115, 1.1, 0.172]} rotation={[0.15, 0, 0.55]}>
          <boxGeometry args={[0.015, 0.52, 0.02]} />
          <meshStandardMaterial color="#d4a017" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.33, 0]}>
          <cylinderGeometry args={[0.055, 0.065, 0.12, 24]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
      </group>
      <group ref={head} position={[0, 1.5, 0]}>
        <mesh scale={[0.86, 1, 0.9]}>
          <sphereGeometry args={[0.16, 64, 48]} />
          <meshStandardMaterial color={skin} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.03, -0.03]} scale={[0.92, 1.02, 0.95]}>
          <sphereGeometry args={[0.165, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color="#1b1410" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.07, -0.16]}>
          <sphereGeometry args={[0.07, 32, 24]} />
          <meshStandardMaterial color="#1b1410" roughness={0.8} />
        </mesh>
        <group ref={eyes} position={[0, 0.03, 0.135]}>
          {[-0.05, 0.05].map((x) => (
            <mesh key={x} position={[x, 0, 0]} scale={[1, 0.7, 0.4]}>
              <sphereGeometry args={[0.018, 24, 16]} />
              <meshStandardMaterial color="#120c08" roughness={0.3} />
            </mesh>
          ))}
        </group>
        <group ref={brows} position={[0, 0.105, 0.13]}>
          {[-0.05, 0.05].map((x) => (
            <mesh key={x} position={[x, -0.035, 0]} rotation={[0, 0, x > 0 ? -0.12 : 0.12]}>
              <boxGeometry args={[0.04, 0.006, 0.006]} />
              <meshStandardMaterial color="#1b1410" />
            </mesh>
          ))}
        </group>
        <mesh position={[0, 0.085, 0.142]}>
          <circleGeometry args={[0.008, 20]} />
          <meshStandardMaterial color="#b3122e" />
        </mesh>
        <mesh ref={mouth} position={[0, -0.075, 0.128]} scale={[1, 0.12, 0.5]}>
          <sphereGeometry args={[0.03, 24, 16]} />
          <meshStandardMaterial color="#6e2a2a" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------

/** If the GLB is present but fails to parse, fall back to the stand-in instead of blanking the page. */
class GlbErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.error("[Saraswati] avatar GLB failed to load; using stand-in", error);
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Resolves whether the realistic GLB is actually deployed (and not the SPA HTML fallback). */
function useGlbAvailable(url: string): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(url, { method: "HEAD" })
      .then((r) => {
        const type = r.headers.get("content-type") ?? "";
        if (!cancelled) setAvailable(r.ok && !type.includes("text/html"));
      })
      .catch(() => !cancelled && setAvailable(false));
    return () => {
      cancelled = true;
    };
  }, [url]);
  return available;
}

export interface SaraswatiAvatarProps {
  state: SaraswatiState;
  getOutputVolume: Getter;
  className?: string;
  avatarUrl?: string;
}

export default function SaraswatiAvatar({ state, getOutputVolume, className, avatarUrl = SARASWATI_AVATAR_URL }: SaraswatiAvatarProps) {
  const reducedMotion = usePrefersReducedMotion();
  const glbAvailable = useGlbAvailable(avatarUrl);

  return (
    <div className={className} aria-hidden="true" data-avatar-source={glbAvailable ? "glb" : glbAvailable === false ? "stand-in" : "pending"}>
      <Canvas camera={{ fov: 28, near: 0.05, far: 50 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[1.5, 2.5, 2]} intensity={1.4} />
        <directionalLight position={[-2, 1.5, 1]} intensity={0.45} color="#ffd9b0" />
        <pointLight position={[0, 1.6, -1]} intensity={0.6} color="#8ab4ff" />
        <Suspense fallback={null}>
          {glbAvailable === true && (
            <GlbErrorBoundary fallback={<StandInAvatar state={state} getOutputVolume={getOutputVolume} reducedMotion={reducedMotion} />}>
              <GlbAvatar url={avatarUrl} state={state} getOutputVolume={getOutputVolume} reducedMotion={reducedMotion} />
            </GlbErrorBoundary>
          )}
          {glbAvailable === false && <StandInAvatar state={state} getOutputVolume={getOutputVolume} reducedMotion={reducedMotion} />}
        </Suspense>
      </Canvas>
    </div>
  );
}
