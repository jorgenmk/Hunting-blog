import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  captionFromFilename,
  formatDistance,
  formatDuration,
  formatList,
  seasonFor,
} from './format.ts';

describe('seasonFor', () => {
  it('starts the season in August', () => {
    assert.equal(seasonFor('2026-10-12', 8).label, 'Jaktsesong 2026/27');
    assert.equal(seasonFor('2027-01-04', 8).label, 'Jaktsesong 2026/27');
    assert.equal(seasonFor('2026-07-20', 8).label, 'Jaktsesong 2025/26');
  });
});

describe('captions and stats text', () => {
  it('builds a caption from the filename', () => {
    assert.equal(captionFromFilename('01-utsikt-fra-ryggen.jpg'), 'Utsikt fra ryggen');
    assert.equal(captionFromFilename('02_bekken.JPEG'), 'Bekken');
    assert.equal(captionFromFilename('01.jpg'), 'Bilde');
  });

  it('formats distance, duration and names in Norwegian style', () => {
    assert.equal(formatDistance(6400, 'nb-NO'), '6,4 km');
    assert.equal(formatDistance(850, 'nb-NO'), '850 m');
    assert.equal(formatDuration(2 * 3600 + 15 * 60), '2 t 15 min');
    assert.equal(formatList(['Ola', 'Kari', 'Per']), 'Ola, Kari og Per');
  });
});
