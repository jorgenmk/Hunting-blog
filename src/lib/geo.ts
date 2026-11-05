import type { NaiveStamp, TrackPoint } from './types.ts';

const EARTH_RADIUS_M = 6_371_000;

export function haversine(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const dφ = ((b.lat - a.lat) * Math.PI) / 180;
  const dλ = ((b.lon - a.lon) * Math.PI) / 180;
  const sin =
    Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(sin)));
}

export function distanceMeters(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversine(points[i - 1], points[i]);
  return total;
}

/**
 * Sum climbs that clear `noiseM`. The baseline only moves when the change is
 * large enough, so a slow real climb still counts and GPS jitter does not.
 */
export function elevationGain(points: TrackPoint[], noiseM: number): number {
  let gain = 0;
  let baseline: number | null = null;
  for (const point of points) {
    if (point.ele == null || !Number.isFinite(point.ele)) continue;
    if (baseline == null) {
      baseline = point.ele;
      continue;
    }
    const delta = point.ele - baseline;
    if (Math.abs(delta) >= noiseM) {
      if (delta > 0) gain += delta;
      baseline = point.ele;
    }
  }
  return gain;
}

export function zonedParts(utcMs: number, timeZone: string): NaiveStamp {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const part: Record<string, string> = {};
  for (const piece of formatted) {
    if (piece.type !== 'literal') part[piece.type] = piece.value;
  }
  let hour = Number(part.hour);
  if (hour === 24) hour = 0;
  return {
    y: Number(part.year),
    m: Number(part.month),
    d: Number(part.day),
    h: hour,
    min: Number(part.minute),
    s: Number(part.second),
  };
}

export function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = zonedParts(utcMs, timeZone);
  const asUtc = Date.UTC(parts.y, parts.m - 1, parts.d, parts.h, parts.min, parts.s);
  return asUtc - utcMs;
}

/** Interpret a clock reading as wall time in `timeZone` and return UTC millis. */
export function naiveInZoneToUtc(stamp: NaiveStamp, timeZone: string): number {
  const guess = Date.UTC(stamp.y, stamp.m - 1, stamp.d, stamp.h, stamp.min, stamp.s);
  const offset = timeZoneOffsetMs(guess, timeZone);
  let utc = guess - offset;
  const refined = timeZoneOffsetMs(utc, timeZone);
  if (refined !== offset) utc = guess - refined;
  return utc;
}

function distanceToRange(value: number, start: number, end: number): number {
  if (value < start) return start - value;
  if (value > end) return value - end;
  return 0;
}

/**
 * EXIF timestamps rarely include a timezone. Pick the interpretation (raw UTC
 * or wall time in `timeZone`) that sits closest to the track. Ties use `preference`.
 */
export function choosePhotoInstant(
  stamp: NaiveStamp,
  rangeStart: number,
  rangeEnd: number,
  timeZone: string,
  preference: 'local' | 'utc',
): number {
  const asUtc = Date.UTC(stamp.y, stamp.m - 1, stamp.d, stamp.h, stamp.min, stamp.s);
  const asLocal = naiveInZoneToUtc(stamp, timeZone);
  const utcDistance = distanceToRange(asUtc, rangeStart, rangeEnd);
  const localDistance = distanceToRange(asLocal, rangeStart, rangeEnd);
  if (localDistance < utcDistance) return asLocal;
  if (utcDistance < localDistance) return asUtc;
  return preference === 'local' ? asLocal : asUtc;
}

export function instantFromExif(
  stamp: NaiveStamp,
  offsetMinutes: number | null,
  rangeStart: number | null,
  rangeEnd: number | null,
  timeZone: string,
  preference: 'local' | 'utc',
): number {
  if (offsetMinutes != null) {
    const wallAsUtc = Date.UTC(stamp.y, stamp.m - 1, stamp.d, stamp.h, stamp.min, stamp.s);
    return wallAsUtc - offsetMinutes * 60 * 1000;
  }
  if (rangeStart == null || rangeEnd == null) {
    return preference === 'utc'
      ? Date.UTC(stamp.y, stamp.m - 1, stamp.d, stamp.h, stamp.min, stamp.s)
      : naiveInZoneToUtc(stamp, timeZone);
  }
  return choosePhotoInstant(stamp, rangeStart, rangeEnd, timeZone, preference);
}

export function positionAtTime(
  points: TrackPoint[],
  instant: number,
  slackMs: number,
): { lat: number; lon: number } | null {
  const timed = points
    .filter((point): point is TrackPoint & { time: number } => point.time != null)
    .sort((a, b) => a.time - b.time);
  if (timed.length === 0) return null;
  const first = timed[0];
  const last = timed[timed.length - 1];
  if (instant < first.time - slackMs || instant > last.time + slackMs) return null;
  if (instant <= first.time) return { lat: first.lat, lon: first.lon };
  if (instant >= last.time) return { lat: last.lat, lon: last.lon };
  for (let i = 0; i < timed.length - 1; i++) {
    const a = timed[i];
    const b = timed[i + 1];
    if (instant < a.time || instant > b.time) continue;
    const span = b.time - a.time;
    const t = span === 0 ? 0 : (instant - a.time) / span;
    return {
      lat: a.lat + (b.lat - a.lat) * t,
      lon: a.lon + (b.lon - a.lon) * t,
    };
  }
  return null;
}

export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function simplifyTrack(
  points: TrackPoint[],
  minMeters = 15,
  maxPoints = 500,
): [number, number][] {
  if (points.length === 0) return [];
  if (points.length === 1) return [[round6(points[0].lat), round6(points[0].lon)]];
  const kept: TrackPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    if (haversine(kept[kept.length - 1], points[i]) >= minMeters) kept.push(points[i]);
  }
  kept.push(points[points.length - 1]);
  const step = Math.max(1, Math.ceil(kept.length / maxPoints));
  const thinned = kept.filter((_, index) => index % step === 0);
  const last = kept[kept.length - 1];
  if (thinned[thinned.length - 1] !== last) thinned.push(last);
  return thinned.map((point) => [round6(point.lat), round6(point.lon)]);
}
