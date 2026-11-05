/**
 * Site-wide settings. Change the title here and nowhere else.
 * Hunting season starts in August: January 2027 belongs to jaktsesong 2026/27.
 */
export const siteConfig = {
  title: 'Jaktloggen',
  tagline: 'Notater, spor og bilder fra jaktdagene.',
  description: 'Logg over jaktdager, spor og bilder.',
  lang: 'nb',
  locale: 'nb-NO',
  timezone: 'Europe/Oslo',
  /** Month number (1–12) when a new hunting season starts. */
  seasonStartMonth: 8,
  /**
   * Camera timestamps usually have no timezone. When a photo has no GPS, the
   * build tries the timestamp as UTC and as this timezone, and keeps the
   * reading that lands on the GPX track. If both fit, this preference wins.
   */
  photoTimeZone: 'Europe/Oslo',
  photoTimePreference: 'local' as 'local' | 'utc',
  /** Ignore elevation changes smaller than this when summing gain. */
  elevationNoiseM: 2,
  /** How far outside the track a photo time may sit and still snap to an end. */
  photoTimeSlackMs: 10 * 60 * 1000,
  images: {
    maxEdge: 1600,
    thumbEdge: 720,
    quality: 80,
    thumbQuality: 72,
  },
  trackColors: ['#243c28', '#9a4e2c', '#1f5c63', '#6d5a1f', '#3d4d7a'],
  maps: {
    topo: {
      name: 'Topografisk',
      url: 'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png',
      attribution: '© <a href="https://www.kartverket.no/">Kartverket</a>',
      maxZoom: 18,
    },
    osm: {
      name: 'OpenStreetMap',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    },
  },
};
