import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  choosePhotoInstant,
  distanceMeters,
  elevationGain,
  haversine,
  instantFromExif,
  naiveInZoneToUtc,
  positionAtTime,
  simplifyTrack,
  timeZoneOffsetMs,
} from './geo.ts';
import type { TrackPoint } from './types.ts';

describe('haversine', () => {
  it('is about 111.2 km per degree of latitude', () => {
    const meters = haversine({ lat: 63, lon: 9 }, { lat: 64, lon: 9 });
    assert.ok(meters > 110_000 && meters < 112_000);
  });
});

describe('elevationGain', () => {
  it('counts a real climb and ignores jitter under the threshold', () => {
    const points: TrackPoint[] = [
      { lat: 0, lon: 0, ele: 100, time: null },
      { lat: 0, lon: 0, ele: 101, time: null },
      { lat: 0, lon: 0, ele: 104, time: null },
      { lat: 0, lon: 0, ele: 103, time: null },
      { lat: 0, lon: 0, ele: 110, time: null },
    ];
    assert.equal(elevationGain(points, 2), 10);
  });
});

describe('distanceMeters', () => {
  it('sums segments', () => {
    const points: TrackPoint[] = [
      { lat: 63.52, lon: 9.1, ele: null, time: null },
      { lat: 63.53, lon: 9.1, ele: null, time: null },
    ];
    assert.ok(distanceMeters(points) > 1000);
  });
});

describe('Europe/Oslo', () => {
  it('is UTC+2 in July and UTC+1 in January', () => {
    assert.equal(timeZoneOffsetMs(Date.parse('2026-07-01T12:00:00Z'), 'Europe/Oslo'), 2 * 3600 * 1000);
    assert.equal(timeZoneOffsetMs(Date.parse('2026-01-15T12:00:00Z'), 'Europe/Oslo'), 1 * 3600 * 1000);
  });

  it('converts a CEST wall time to UTC', () => {
    const utc = naiveInZoneToUtc({ y: 2026, m: 10, d: 12, h: 9, min: 45, s: 0 }, 'Europe/Oslo');
    assert.equal(utc, Date.parse('2026-10-12T07:45:00Z'));
  });
});

describe('choosePhotoInstant', () => {
  const start = Date.parse('2026-10-12T07:30:00Z');
  const end = Date.parse('2026-10-12T10:00:00Z');

  it('prefers the reading that lands inside the track', () => {
    const localOnly = choosePhotoInstant(
      { y: 2026, m: 10, d: 12, h: 9, min: 0, s: 0 },
      Date.parse('2026-10-12T06:00:00Z'),
      Date.parse('2026-10-12T08:00:00Z'),
      'Europe/Oslo',
      'utc',
    );
    assert.equal(localOnly, Date.parse('2026-10-12T07:00:00Z'));

    const utcOnly = choosePhotoInstant(
      { y: 2026, m: 10, d: 12, h: 9, min: 0, s: 0 },
      start,
      end,
      'Europe/Oslo',
      'local',
    );
    assert.equal(utcOnly, Date.parse('2026-10-12T09:00:00Z'));
  });

  it('uses the local preference when both readings fit', () => {
    const both = choosePhotoInstant(
      { y: 2026, m: 10, d: 12, h: 9, min: 45, s: 0 },
      start,
      end,
      'Europe/Oslo',
      'local',
    );
    assert.equal(both, Date.parse('2026-10-12T07:45:00Z'));
  });

  it('honours an explicit offset', () => {
    const utc = instantFromExif(
      { y: 2026, m: 10, d: 12, h: 9, min: 45, s: 0 },
      120,
      null,
      null,
      'Europe/Oslo',
      'utc',
    );
    assert.equal(utc, Date.parse('2026-10-12T07:45:00Z'));
  });
});

describe('positionAtTime', () => {
  const points: TrackPoint[] = [
    { lat: 63.5, lon: 9.1, ele: 10, time: 0 },
    { lat: 63.6, lon: 9.2, ele: 20, time: 1000 },
  ];

  it('interpolates between timed points', () => {
    const pos = positionAtTime(points, 500, 0);
    assert.ok(pos);
    assert.ok(Math.abs(pos.lat - 63.55) < 1e-12);
    assert.ok(Math.abs(pos.lon - 9.15) < 1e-12);
  });

  it('refuses timestamps far outside the track', () => {
    assert.equal(positionAtTime(points, 20 * 60 * 1000, 10 * 60 * 1000), null);
  });

  it('snaps to the end inside the slack window', () => {
    const pos = positionAtTime(points, 1000 + 5 * 60 * 1000, 10 * 60 * 1000);
    assert.deepEqual(pos, { lat: 63.6, lon: 9.2 });
  });
});

describe('simplifyTrack', () => {
  it('keeps the first and last point', () => {
    const points: TrackPoint[] = [
      { lat: 63.5, lon: 9.1, ele: null, time: null },
      { lat: 63.50001, lon: 9.10001, ele: null, time: null },
      { lat: 63.52, lon: 9.12, ele: null, time: null },
    ];
    const line = simplifyTrack(points, 15, 10);
    assert.equal(line[0][0], 63.5);
    assert.equal(line[line.length - 1][0], 63.52);
  });
});
