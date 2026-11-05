import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseGpx } from './gpx.ts';

const sample = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="test">
  <trk><name>A</name><trkseg>
    <trkpt lat="63.52" lon="9.10"><ele>40.5</ele><time>2026-10-12T07:30:00Z</time></trkpt>
    <trkpt lon="9.11" lat="63.53"><ele>80</ele><time>2026-10-12T08:00:00Z</time></trkpt>
  </trkseg></trk>
  <trk><trkseg>
    <trkpt lat="63.54" lon="9.12"/>
  </trkseg></trk>
</gpx>`;

describe('parseGpx', () => {
  it('reads Garmin track points, elevation and time', () => {
    const segments = parseGpx(sample);
    assert.equal(segments.length, 2);
    assert.equal(segments[0].length, 2);
    assert.equal(segments[0][0].lat, 63.52);
    assert.equal(segments[0][0].lon, 9.1);
    assert.equal(segments[0][0].ele, 40.5);
    assert.equal(segments[0][0].time, Date.parse('2026-10-12T07:30:00Z'));
    assert.equal(segments[0][1].lat, 63.53);
    assert.equal(segments[1][0].ele, null);
    assert.equal(segments[1][0].time, null);
  });

  it('accepts route points when there is no track', () => {
    const xml = `<gpx><rte><rtept lat="63.5" lon="9.1"><ele>12</ele></rtept></rte></gpx>`;
    const segments = parseGpx(xml);
    assert.equal(segments.length, 1);
    assert.equal(segments[0][0].ele, 12);
  });
});
