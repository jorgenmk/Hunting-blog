import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { siteConfig } from '../config.ts';
import { readPhotoExif } from './exif.ts';
import { fingerprintSources } from './fingerprint.ts';
import { captionFromFilename } from './format.ts';
import {
  distanceMeters,
  elevationGain,
  haversine,
  instantFromExif,
  positionAtTime,
  round6,
  simplifyTrack,
} from './geo.ts';
import { parseGpx } from './gpx.ts';
import { daysDir, manifestPath, mediaDir, repoRoot } from './paths.ts';
import type { DayRecord, DayTrack, Manifest, PhotoRecord, TrackPoint } from './types.ts';

const DAY_ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']);

function outputStem(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, '');
  const safe = stem
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
  return safe || 'bilde';
}

function mediaReady(manifest: Manifest): boolean {
  return manifest.days.every((day) =>
    day.photos.every((photo) =>
      existsSync(path.join(repoRoot, 'public', photo.src.replace(/^\//, ''))),
    ),
  );
}

async function writeDerivative(
  input: string,
  output: string,
  edge: number,
  quality: number,
): Promise<{ width: number; height: number }> {
  const info = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toFile(output);
  return { width: info.width, height: info.height };
}

function frontmatterDate(markdown: string, id: string): void {
  const block = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) throw new Error(`${id}: index.md must start with --- frontmatter ---`);
  const date = block[1].match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m);
  if (!date) throw new Error(`${id}: frontmatter date must be YYYY-MM-DD`);
  const folderDate = id.slice(0, 10);
  if (date[1] !== folderDate) {
    throw new Error(`${id}: folder date ${folderDate} does not match frontmatter date ${date[1]}`);
  }
}

async function prepareDay(id: string, folder: string): Promise<DayRecord> {
  const names = readdirSync(folder).filter((name) => !name.startsWith('.'));
  if (!names.includes('index.md')) {
    throw new Error(`${id}: add index.md (exact lowercase filename)`);
  }
  frontmatterDate(readFileSync(path.join(folder, 'index.md'), 'utf8'), id);

  const gpxNames = names
    .filter((name) => name.toLowerCase().endsWith('.gpx'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }));
  const images = names
    .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'nb', { numeric: true, sensitivity: 'base' }));
  const known = new Set(['index.md', ...gpxNames, ...images]);
  const extra = names.filter((name) => !known.has(name));
  if (extra.length > 0) console.warn(`[jaktloggen] ${id}: ignoring ${extra.join(', ')}`);

  const parsed: { file: string; segments: TrackPoint[][] }[] = [];
  for (const name of gpxNames) {
    const segments = parseGpx(readFileSync(path.join(folder, name), 'utf8')).filter(
      (segment) => segment.length > 0,
    );
    if (segments.length === 0) throw new Error(`${id}: ${name} has no track points`);
    parsed.push({ file: name, segments });
  }

  let distanceM: number | null = parsed.length > 0 ? 0 : null;
  let elevationGainM: number | null = parsed.length > 0 ? 0 : null;
  let startedAt: number | null = null;
  let endedAt: number | null = null;
  let durationS: number | null = null;
  const timed: TrackPoint[] = [];
  const tracks: DayTrack[] = [];
  for (const file of parsed) {
    let fileStart: number | null = null;
    let fileEnd: number | null = null;
    for (const segment of file.segments) {
      distanceM = (distanceM ?? 0) + distanceMeters(segment);
      elevationGainM = (elevationGainM ?? 0) + elevationGain(segment, siteConfig.elevationNoiseM);
      for (const point of segment) {
        if (point.time == null) continue;
        timed.push(point);
        fileStart = fileStart == null ? point.time : Math.min(fileStart, point.time);
        fileEnd = fileEnd == null ? point.time : Math.max(fileEnd, point.time);
        startedAt = startedAt == null ? point.time : Math.min(startedAt, point.time);
        endedAt = endedAt == null ? point.time : Math.max(endedAt, point.time);
      }
    }
    if (fileStart != null && fileEnd != null) {
      durationS = (durationS ?? 0) + Math.max(0, (fileEnd - fileStart) / 1000);
    }
    tracks.push({
      file: file.file,
      segments: file.segments.map((segment) => simplifyTrack(segment)).filter((segment) => segment.length > 0),
    });
  }

  let loop = false;
  let start: [number, number] | null = null;
  let end: [number, number] | null = null;
  if (parsed.length === 1) {
    const only = parsed[0].segments;
    const first = only[0][0];
    const last = only[only.length - 1][only[only.length - 1].length - 1];
    loop = haversine(first, last) < 40;
    start = [round6(first.lat), round6(first.lon)];
    end = [round6(last.lat), round6(last.lon)];
  }

  const dayMedia = path.join(mediaDir, id);
  rmSync(dayMedia, { recursive: true, force: true });
  mkdirSync(dayMedia, { recursive: true });

  const used = new Set<string>();
  const photos: PhotoRecord[] = [];
  for (const file of images) {
    let stem = outputStem(file);
    const base = stem;
    let n = 2;
    while (used.has(stem)) stem = `${base}-${n++}`;
    used.add(stem);

    const input = path.join(folder, file);
    const fullName = `${stem}.webp`;
    const thumbName = `${stem}-thumb.webp`;
    let full: { width: number; height: number };
    let thumb: { width: number; height: number };
    try {
      full = await writeDerivative(
        input,
        path.join(dayMedia, fullName),
        siteConfig.images.maxEdge,
        siteConfig.images.quality,
      );
      thumb = await writeDerivative(
        input,
        path.join(dayMedia, thumbName),
        siteConfig.images.thumbEdge,
        siteConfig.images.thumbQuality,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${id}/${file}: could not read this image (${message}). Convert HEIC/HEIF to JPEG if the build cannot decode it.`,
      );
    }

    const exif = await readPhotoExif(input);
    let lat = exif.latitude;
    let lon = exif.longitude;
    let placedBy: PhotoRecord['placedBy'] = lat != null && lon != null ? 'gps' : null;
    let takenAt: string | null = null;
    if (exif.naive) {
      const instant = instantFromExif(
        exif.naive,
        exif.offsetMinutes,
        startedAt,
        endedAt,
        siteConfig.photoTimeZone,
        siteConfig.photoTimePreference,
      );
      takenAt = new Date(instant).toISOString();
      if (placedBy == null) {
        const matched = positionAtTime(timed, instant, siteConfig.photoTimeSlackMs);
        if (matched) {
          lat = matched.lat;
          lon = matched.lon;
          placedBy = 'time';
        }
      }
    }
    if (placedBy == null) {
      console.warn(`[jaktloggen] ${id}/${file}: no map pin (no GPS, and time did not match the track)`);
    } else {
      console.log(
        `[jaktloggen] ${id}/${file}: ${placedBy} ${lat?.toFixed(5)}, ${lon?.toFixed(5)}`,
      );
    }

    photos.push({
      id: stem,
      file,
      caption: captionFromFilename(file),
      src: `/media/${id}/${fullName}`,
      thumb: `/media/${id}/${thumbName}`,
      width: full.width,
      height: full.height,
      thumbWidth: thumb.width,
      thumbHeight: thumb.height,
      takenAt,
      lat: lat == null ? null : round6(lat),
      lon: lon == null ? null : round6(lon),
      placedBy,
    });
  }

  return {
    id,
    distanceM,
    elevationGainM,
    startedAt: startedAt == null ? null : new Date(startedAt).toISOString(),
    endedAt: endedAt == null ? null : new Date(endedAt).toISOString(),
    durationS,
    loop,
    start,
    end,
    tracks,
    photos,
  };
}

function writeManifest(manifest: Manifest): void {
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  const tmp = `${manifestPath}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(tmp, manifestPath);
}

function removeStaleMedia(ids: Set<string>): void {
  if (!existsSync(mediaDir)) return;
  for (const name of readdirSync(mediaDir)) {
    if (!ids.has(name)) rmSync(path.join(mediaDir, name), { recursive: true, force: true });
  }
}

export async function prepareDays(): Promise<void> {
  const fingerprint = fingerprintSources();
  if (existsSync(manifestPath)) {
    try {
      const current = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
      if (current.fingerprint === fingerprint && mediaReady(current)) {
        console.log('[jaktloggen] Day folders are up to date.');
        return;
      }
    } catch {
      // Rebuild when the manifest is unreadable.
    }
  }

  if (!existsSync(daysDir)) {
    writeManifest({ fingerprint, days: [] });
    removeStaleMedia(new Set());
    console.log('[jaktloggen] No src/content/days directory.');
    return;
  }

  const entries = readdirSync(daysDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const days: DayRecord[] = [];
  for (const entry of entries) {
    if (!DAY_ID.test(entry.name)) {
      throw new Error(
        `${entry.name}: folder name must be YYYY-MM-DD-short-slug (lowercase ascii, hyphens)`,
      );
    }
    console.log(`[jaktloggen] Preparing ${entry.name}`);
    days.push(await prepareDay(entry.name, path.join(daysDir, entry.name)));
  }
  days.sort((a, b) => a.id.localeCompare(b.id));
  writeManifest({ fingerprint, days });
  removeStaleMedia(new Set(days.map((day) => day.id)));
  console.log(`[jaktloggen] Prepared ${days.length} day(s).`);
}
