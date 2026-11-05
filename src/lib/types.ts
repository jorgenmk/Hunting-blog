export type NaiveStamp = {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
  s: number;
};

export type TrackPoint = {
  lat: number;
  lon: number;
  ele: number | null;
  time: number | null;
};

export type PhotoRecord = {
  id: string;
  file: string;
  caption: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
  takenAt: string | null;
  lat: number | null;
  lon: number | null;
  placedBy: 'gps' | 'time' | null;
};

export type DayRecord = {
  id: string;
  distanceM: number;
  elevationGainM: number;
  startedAt: string | null;
  endedAt: string | null;
  durationS: number | null;
  loop: boolean;
  start: [number, number] | null;
  end: [number, number] | null;
  tracks: [number, number][][];
  photos: PhotoRecord[];
};

export type Manifest = {
  fingerprint: string;
  days: DayRecord[];
};

export type MapPhoto = {
  id: string;
  n: number;
  lat: number;
  lon: number;
  thumb: string;
  caption: string;
  placedBy: 'gps' | 'time';
};

export type MapTrack = {
  label: string;
  href?: string;
  color: string;
  segments: [number, number][][];
};

export type MapTiles = {
  topo: { name: string; url: string; attribution: string; maxZoom: number };
  osm: { name: string; url: string; attribution: string; maxZoom: number };
};

export type MapPayload = {
  tracks: MapTrack[];
  photos: MapPhoto[];
  start: [number, number] | null;
  end: [number, number] | null;
  loop: boolean;
  tiles: MapTiles;
};
