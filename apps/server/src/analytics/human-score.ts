import type { BioEvent } from '@bio-sdk/protocol';

/**
 * ⚠ DEMO HEURISTIC — NOT a real biometric model.
 * A production system would use ML features trained on labeled data.
 * This is purely illustrative for demo purposes.
 */

export interface HumanScoreResult {
  score: number;      // 0–100, higher = more human-like
  label: 'human' | 'bot' | 'uncertain';
  factors: Factor[];
  disclaimer: string;
}

export interface Factor {
  name: string;
  value: number;      // 0–1
  weight: number;
  description: string;
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** How curved/organic is the mouse trajectory? Bots tend to move in straight lines. */
function trajectoryVariance(moves: BioEvent[]): number {
  if (moves.length < 3) return 0.5;
  const dxs: number[] = [];
  const dys: number[] = [];
  for (let i = 1; i < moves.length; i++) {
    const prev = moves[i - 1];
    const curr = moves[i];
    if (prev?.x !== undefined && curr?.x !== undefined && prev?.y !== undefined && curr?.y !== undefined) {
      dxs.push(curr.x - prev.x);
      dys.push(curr.y - prev.y);
    }
  }
  const sdX = stddev(dxs);
  const sdY = stddev(dys);
  return clamp((sdX + sdY) / 20); // normalize heuristically
}

/** How irregular are inter-keystroke intervals? Humans are noisy, bots are precise. */
function keystrokeIrregularity(keys: BioEvent[]): number {
  const dts = keys.map(e => e.dt).filter((dt): dt is number => dt !== undefined);
  if (dts.length < 2) return 0.5;
  const sd = stddev(dts);
  return clamp(sd / 150); // 150 ms sd = very human
}

/** Do we see micro-pauses (gaps > 500 ms between events)? Humans take breaks. */
function microPausePresence(events: BioEvent[]): number {
  const pauses = events.filter(e => e.dt !== undefined && e.dt > 500);
  return clamp(pauses.length / Math.max(events.length * 0.1, 1));
}

/** Does mouse speed vary naturally? Bots often move at constant velocity. */
function speedVariance(moves: BioEvent[]): number {
  if (moves.length < 3) return 0.5;
  const speeds: number[] = [];
  for (let i = 1; i < moves.length; i++) {
    const prev = moves[i - 1];
    const curr = moves[i];
    if (
      prev?.x !== undefined && curr?.x !== undefined &&
      prev?.y !== undefined && curr?.y !== undefined &&
      curr.dt !== undefined && curr.dt > 0
    ) {
      const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      speeds.push(dist / curr.dt);
    }
  }
  const sd = stddev(speeds);
  return clamp(sd / 2);
}

export function computeHumanScore(events: BioEvent[]): HumanScoreResult {
  const moves = events.filter(e => e.type === 'mousemove');
  const keys  = events.filter(e => e.type === 'keydown');

  const factors: Factor[] = [
    {
      name: 'Trajectory variance',
      value: trajectoryVariance(moves),
      weight: 0.3,
      description: 'Organic mouse paths curve and jitter; bot paths are linear.',
    },
    {
      name: 'Keystroke irregularity',
      value: keystrokeIrregularity(keys),
      weight: 0.3,
      description: 'Human typing rhythm varies; bots produce perfectly regular intervals.',
    },
    {
      name: 'Micro-pauses',
      value: microPausePresence(events),
      weight: 0.2,
      description: 'Humans naturally pause; automated scripts rarely idle.',
    },
    {
      name: 'Speed variance',
      value: speedVariance(moves),
      weight: 0.2,
      description: 'Human mouse speed accelerates and decelerates; bots move at constant velocity.',
    },
  ];

  const score = Math.round(
    factors.reduce((sum, f) => sum + f.value * f.weight, 0) * 100,
  );

  const label: HumanScoreResult['label'] =
    score >= 65 ? 'human' : score <= 35 ? 'bot' : 'uncertain';

  return {
    score,
    label,
    factors,
    disclaimer:
      'DEMO HEURISTIC — not a validated biometric model. For illustration only.',
  };
}
