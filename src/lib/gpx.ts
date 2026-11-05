import type { TrackPoint } from './types.ts';

function attr(source: string, name: string): string | null {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, 'i'));
  return match ? match[2] : null;
}

function parsePoints(chunk: string): TrackPoint[] {
  const points: TrackPoint[] = [];
  const pattern = /<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/gi;
  for (const match of chunk.matchAll(pattern)) {
    const lat = Number(attr(match[1], 'lat'));
    const lon = Number(attr(match[1], 'lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const inner = match[2] ?? '';
    const eleMatch = inner.match(/<ele>\s*([^<]+?)\s*<\/ele>/i);
    const timeMatch = inner.match(/<time>\s*([^<]+?)\s*<\/time>/i);
    const ele = eleMatch ? Number(eleMatch[1]) : Number.NaN;
    const time = timeMatch ? Date.parse(timeMatch[1]) : Number.NaN;
    points.push({
      lat,
      lon,
      ele: Number.isFinite(ele) ? ele : null,
      time: Number.isFinite(time) ? time : null,
    });
  }
  return points;
}

export function parseGpx(xml: string): TrackPoint[][] {
  const source = xml.replace(/^\uFEFF/, '');
  const segments: TrackPoint[][] = [];
  for (const match of source.matchAll(/<trkseg\b[^>]*>([\s\S]*?)<\/trkseg>/gi)) {
    const points = parsePoints(match[1]);
    if (points.length > 0) segments.push(points);
  }
  if (segments.length > 0) return segments;
  const direct = parsePoints(source);
  if (direct.length > 0) return [direct];
  const route = parsePoints(source.replace(/<(\/?)rtept\b/gi, '<$1trkpt'));
  return route.length > 0 ? [route] : [];
}
