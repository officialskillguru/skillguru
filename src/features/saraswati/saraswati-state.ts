// Pure mapping from ElevenLabs session signals to Saraswati's avatar state.
// Kept framework-free so it can be unit-tested without the SDK or WebGL.

export type SaraswatiState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export interface SaraswatiSignals {
  /** ElevenLabs connection status. */
  status: "disconnected" | "connecting" | "connected" | "error";
  /** ElevenLabs turn mode: who currently holds the floor. */
  mode: "speaking" | "listening";
  /** True from the user's final transcript until the agent starts replying. */
  awaitingReply: boolean;
  /** A local failure (e.g. signed-URL fetch or mic permission) not reported by the SDK. */
  localError: boolean;
}

export function deriveSaraswatiState(s: SaraswatiSignals): SaraswatiState {
  if (s.localError || s.status === "error") return "error";
  if (s.status === "connecting") return "connecting";
  if (s.status !== "connected") return "idle";
  if (s.mode === "speaking") return "speaking";
  return s.awaitingReply ? "thinking" : "listening";
}

export const STATE_LABELS: Record<SaraswatiState, string> = {
  idle: "Ready to talk",
  connecting: "Connecting…",
  listening: "Listening",
  thinking: "Thinking…",
  speaking: "Speaking",
  error: "Something went wrong",
};

/**
 * Maps raw output volume (0–1, typically small) to a smoothed mouth-open amount.
 * `previous` is last frame's value; attack is fast and release is slower so the
 * jaw snaps open on syllables and eases closed, which reads as natural speech.
 */
export function mouthOpenFromVolume(volume: number, previous: number, delta: number): number {
  const v = Number.isFinite(volume) ? volume : 0;
  // Noise gate + gain: ElevenLabs output volume for speech mostly sits in 0.02–0.4.
  const target = Math.min(1, Math.max(0, (v - 0.015) * 3.2));
  const rate = target > previous ? 28 : 12;
  const t = 1 - Math.exp(-rate * Math.max(0, delta));
  return previous + (target - previous) * t;
}
