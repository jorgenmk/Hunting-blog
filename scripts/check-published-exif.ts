import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import exifr from 'exifr';
import { manifestPath } from '../src/lib/paths.ts';
import type { Manifest } from '../src/lib/types.ts';

const dist = process.argv[2];
if (!dist) {
  console.error('Usage: check-published-exif.ts <dist-directory>');
  process.exit(1);
}

const imageExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tif', '.tiff']);

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (imageExt.has(path.extname(name).toLowerCase())) files.push(full);
  }
  return files;
}

const manifest: Manifest = existsSync(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest)
  : { fingerprint: '', days: [] };

const missing: string[] = [];
for (const day of manifest.days ?? []) {
  for (const photo of day.photos) {
    for (const url of [photo.src, photo.thumb]) {
      const file = path.join(dist, url.replace(/^\//, ''));
      if (!existsSync(file)) missing.push(url);
    }
  }
}
if (missing.length > 0) {
  console.error(`[jaktloggen] Published day images are missing from dist:\n${missing.join('\n')}`);
  process.exit(1);
}

const leaks: string[] = [];
for (const file of walk(dist)) {
  const gps = await exifr.gps(file).catch(() => null);
  if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
    leaks.push(path.relative(dist, file));
  }
}
if (leaks.length > 0) {
  console.error(
    `[jaktloggen] Published images still contain GPS EXIF:\n${leaks.join('\n')}\n` +
      'Drop photos in the day folder. The build publishes resized copies with EXIF removed.',
  );
  process.exit(1);
}

console.log('[jaktloggen] Published images have no GPS EXIF.');
