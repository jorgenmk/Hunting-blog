import exifr from 'exifr';
import type { NaiveStamp } from './types.ts';

export type PhotoExif = {
  latitude: number | null;
  longitude: number | null;
  naive: NaiveStamp | null;
  offsetMinutes: number | null;
};

function parseNaive(value: unknown): NaiveStamp | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
    h: Number(match[4]),
    min: Number(match[5]),
    s: Number(match[6]),
  };
}

function parseOffset(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) return null;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

export async function readPhotoExif(file: string): Promise<PhotoExif> {
  const gps = await exifr.gps(file).catch(() => null);
  const raw = await exifr
    .parse(file, {
      reviveValues: false,
      mergeOutput: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'DateTime', 'OffsetTimeOriginal', 'OffsetTime'],
    })
    .catch(() => null);
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const naive =
    parseNaive(record.DateTimeOriginal) ??
    parseNaive(record.CreateDate) ??
    parseNaive(record.DateTime);
  const offsetMinutes = parseOffset(record.OffsetTimeOriginal) ?? parseOffset(record.OffsetTime);
  return {
    latitude: gps && Number.isFinite(gps.latitude) ? gps.latitude : null,
    longitude: gps && Number.isFinite(gps.longitude) ? gps.longitude : null,
    naive,
    offsetMinutes,
  };
}
