import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import exifr from 'exifr';
import sharp from 'sharp';
import { distanceMeters, elevationGain, haversine, zonedParts } from '../src/lib/geo.ts';
import { repoRoot } from '../src/lib/paths.ts';
import type { TrackPoint } from '../src/lib/types.ts';

const require = createRequire(import.meta.url);
const piexif = require('piexifjs') as {
  dump: (data: unknown) => string;
  insert: (exifBytes: string, jpeg: string) => string;
  ImageIFD: Record<string, number>;
  ExifIFD: Record<string, number>;
  GPSIFD: Record<string, number>;
};

const folder = path.join(repoRoot, 'src', 'content', 'days', '2026-10-12-hitra-eksempel');

const waypoints = [
  { lat: 63.519, lon: 9.09, ele: 28 },
  { lat: 63.5238, lon: 9.1015, ele: 62 },
  { lat: 63.5292, lon: 9.114, ele: 118 },
  { lat: 63.5348, lon: 9.1275, ele: 176 },
  { lat: 63.5392, lon: 9.139, ele: 214 },
  { lat: 63.536, lon: 9.151, ele: 168 },
  { lat: 63.5295, lon: 9.1465, ele: 122 },
  { lat: 63.5242, lon: 9.132, ele: 84 },
  { lat: 63.5208, lon: 9.1145, ele: 52 },
  { lat: 63.519, lon: 9.09, ele: 30 },
];

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function move(lat: number, lon: number, eastM: number, northM: number): { lat: number; lon: number } {
  return {
    lat: lat + northM / 111_320,
    lon: lon + eastM / (111_320 * Math.cos((lat * Math.PI) / 180)),
  };
}

function segmentMeters(a: (typeof waypoints)[number], b: (typeof waypoints)[number]) {
  const north = (b.lat - a.lat) * 111_320;
  const east = (b.lon - a.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  const dist = Math.hypot(east, north);
  return { east, north, dist };
}

function buildTrack(): TrackPoint[] {
  const rng = mulberry32(20261012);
  const points: TrackPoint[] = [];
  let time = Date.parse('2026-10-12T07:15:00Z');
  const push = (lat: number, lon: number, ele: number) => {
    if (points.length > 0) {
      const prev = points[points.length - 1];
      const step = haversine(prev, { lat, lon });
      const slope = step > 1 ? (ele - (prev.ele ?? ele)) / step : 0;
      let speed = 1.15;
      if (slope > 0) speed = 1.15 / (1 + slope * 7);
      else speed = Math.min(1.7, 1.15 * (1 + -slope * 2.5));
      time += (step / Math.max(0.4, speed)) * 1000;
    }
    points.push({ lat, lon, ele, time });
  };

  push(waypoints[0].lat, waypoints[0].lon, waypoints[0].ele);
  for (let s = 0; s < waypoints.length - 1; s++) {
    const a = waypoints[s];
    const b = waypoints[s + 1];
    const vec = segmentMeters(a, b);
    const steps = Math.max(1, Math.round(vec.dist / 25));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const eleT = (1 - Math.cos(Math.PI * t)) / 2;
      let lat = a.lat + (b.lat - a.lat) * t;
      let lon = a.lon + (b.lon - a.lon) * t;
      const ele = a.ele + (b.ele - a.ele) * eleT + (rng() - 0.5) * 1.2;
      if (i !== steps && points.length > 1) {
        const wobble = (rng() - 0.5) * 18;
        const shifted = move(lat, lon, (-vec.north / vec.dist) * wobble, (vec.east / vec.dist) * wobble);
        lat = shifted.lat;
        lon = shifted.lon;
      }
      push(lat, lon, ele);
    }
  }
  return points;
}

function gpxTime(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function toGpx(points: TrackPoint[]): string {
  const trkpt = points
    .map(
      (point) =>
        `      <trkpt lat="${point.lat.toFixed(6)}" lon="${point.lon.toFixed(6)}"><ele>${(point.ele ?? 0).toFixed(1)}</ele><time>${gpxTime(point.time ?? 0)}</time></trkpt>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Jaktloggen sample generator"
  xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Hitra eksempel</name>
    <desc>Syntetisk eksempelspor nær Hitra (63.52N, 9.10E). Ikke en ekte tur.</desc>
  </metadata>
  <trk>
    <name>Hitra eksempel</name>
    <trkseg>
${trkpt}
    </trkseg>
  </trk>
</gpx>
`;
}

function exifStamp(ms: number): string {
  const part = zonedParts(ms, 'Europe/Oslo');
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${part.y}:${pad(part.m)}:${pad(part.d)} ${pad(part.h)}:${pad(part.min)}:${pad(part.s)}`;
}

function toDms(value: number): [number, number][] {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return [
    [degrees, 1],
    [minutes, 1],
    [Math.round(seconds * 10_000), 10_000],
  ];
}

function embedExif(
  jpeg: Buffer,
  when: string,
  coords: { lat: number; lon: number } | null,
): Buffer {
  const exif: Record<string, Record<number, unknown>> = {
    '0th': {
      [piexif.ImageIFD.ImageDescription]: 'SAMPLE DATA. Synthetic Jaktloggen placeholder, not a real photo.',
      [piexif.ImageIFD.Artist]: 'Jaktloggen sample',
      [piexif.ImageIFD.Software]: 'jaktloggen-sample-generator',
    },
    Exif: {
      [piexif.ExifIFD.DateTimeOriginal]: when,
      [piexif.ExifIFD.DateTimeDigitized]: when,
    },
  };
  if (coords) {
    exif.GPS = {
      [piexif.GPSIFD.GPSVersionID]: [2, 2, 0, 0],
      [piexif.GPSIFD.GPSLatitudeRef]: coords.lat >= 0 ? 'N' : 'S',
      [piexif.GPSIFD.GPSLatitude]: toDms(coords.lat),
      [piexif.GPSIFD.GPSLongitudeRef]: coords.lon >= 0 ? 'E' : 'W',
      [piexif.GPSIFD.GPSLongitude]: toDms(coords.lon),
    };
  }
  const bytes = piexif.dump(exif);
  return Buffer.from(piexif.insert(bytes, jpeg.toString('binary')), 'binary');
}

function scene(options: {
  title: string;
  sky: [string, string];
  far: string;
  near: string;
  sun: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${options.sky[0]}"/>
      <stop offset="1" stop-color="${options.sky[1]}"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#sky)"/>
  <circle cx="1240" cy="210" r="74" fill="${options.sun}"/>
  <path d="M0 620 C 220 540, 380 700, 640 610 C 900 520, 1100 690, 1600 560 L 1600 1000 L 0 1000 Z" fill="${options.far}"/>
  <path d="M0 760 C 260 680, 520 840, 860 750 C 1160 670, 1360 820, 1600 760 L 1600 1000 L 0 1000 Z" fill="${options.near}"/>
  <rect x="56" y="56" width="360" height="64" rx="8" fill="#2a2118"/>
  <text x="236" y="98" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-size="28" letter-spacing="3" fill="#f4efe4">EKSEMPELDATA</text>
  <text x="72" y="900" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-size="64" fill="#f7f3ea">${options.title}</text>
  <text x="72" y="948" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-size="28" fill="#f7f3ea">Syntetisk bilde, ikke et ekte foto</text>
</svg>`;
}

const scenes = [
  {
    file: '01-bekken.jpg',
    at: 0.16,
    title: 'Bekken',
    sky: ['#d7e4ef', '#f2e6cf'] as [string, string],
    far: '#6d8494',
    near: '#3f5c45',
    sun: '#f0d7a2',
    gps: true,
  },
  {
    file: '02-utsikt-fra-ryggen.jpg',
    at: 0.5,
    title: 'Utsikt fra ryggen',
    sky: ['#9ebfd4', '#f6e7c8'] as [string, string],
    far: '#5d7384',
    near: '#2f4a34',
    sun: '#f2c56b',
    gps: true,
  },
  {
    file: '03-i-lia.jpg',
    at: 0.66,
    title: 'I lia',
    sky: ['#f0d7b0', '#f7efe2'] as [string, string],
    far: '#8a6a52',
    near: '#5c6b3d',
    sun: '#e7a35a',
    gps: true,
  },
  {
    file: '04-uten-gps.jpg',
    at: 0.9,
    title: 'Uten GPS',
    sky: ['#d5d0c4', '#efe6d4'] as [string, string],
    far: '#7d8b78',
    near: '#3d4a38',
    sun: '#f2d7a2',
    gps: false,
  },
];

const markdown = `---
title: Prøvedag i åsene på Hitra
date: 2026-10-12
participants:
  - Ola Nordmann
  - Kari Nordmann
area: Hitra
summary: Syntetisk eksempel med spor og bilder. Slett mappen når ekte dager er lagt inn.
---

> Dette er en eksempelpost. Sporet, bildene og navnene er oppdiktet så kartet kan prøves. Slett hele mappen \`2026-10-12-hitra-eksempel\` når den ikke trengs lenger.

Vi satte fra en grusvei sørøst på Hitra og gikk innover mot en lav åsrygg. Lyngen var våt, og det lå noen ferske spor i stien, men vi så ingen dyr.

Bildene er enkle tegninger med GPS skrevet inn i EXIF, lagt langs det samme sporet. Teksten bruker æ, ø og å for å vise at norsk tegnsett kommer med.
`;

const track = buildTrack();
rmSync(folder, { recursive: true, force: true });
mkdirSync(folder, { recursive: true });
writeFileSync(path.join(folder, 'index.md'), markdown);
writeFileSync(path.join(folder, 'hitra-eksempel.gpx'), toGpx(track));

for (const sceneSpec of scenes) {
  const point = track[Math.round(sceneSpec.at * (track.length - 1))];
  const svg = scene(sceneSpec);
  const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
  const when = exifStamp(point.time ?? 0);
  const stamped = embedExif(
    jpeg,
    when,
    sceneSpec.gps ? { lat: point.lat, lon: point.lon } : null,
  );
  const file = path.join(folder, sceneSpec.file);
  writeFileSync(file, stamped);
  const gps = await exifr.gps(file);
  const raw = (await exifr.parse(file, { reviveValues: false })) as { DateTimeOriginal?: string };
  if (sceneSpec.gps) {
    if (!gps || Math.abs(gps.latitude - point.lat) > 1e-4 || Math.abs(gps.longitude - point.lon) > 1e-4) {
      throw new Error(`${sceneSpec.file}: EXIF GPS did not round-trip`);
    }
  } else if (gps) {
    throw new Error(`${sceneSpec.file}: expected no GPS EXIF`);
  }
  if (raw.DateTimeOriginal !== when) {
    throw new Error(`${sceneSpec.file}: EXIF time ${raw.DateTimeOriginal} !== ${when}`);
  }
  console.log(
    `${sceneSpec.file} ${when} ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`,
  );
}

const distanceKm = distanceMeters(track) / 1000;
const gain = elevationGain(track, 2);
const hours = ((track[track.length - 1].time ?? 0) - (track[0].time ?? 0)) / 3_600_000;
console.log(
  `Sample track: ${track.length} points, ${distanceKm.toFixed(2)} km, ${Math.round(gain)} m gain, ${hours.toFixed(2)} h`,
);
