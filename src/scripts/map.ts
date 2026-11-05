import L from 'leaflet';
import type { MapPayload, MapPhoto } from '../lib/types';
import { mountGallery } from './gallery';

type Registry = {
  el: HTMLElement;
  map: L.Map;
  photos: Map<string, MapPhoto>;
  markers: Map<string, L.Marker>;
  token: number;
};

const registries: Registry[] = [];

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function pinIcon(photo: MapPhoto, active: boolean): L.DivIcon {
  const classes = ['pin'];
  if (active) classes.push('is-active');
  if (photo.placedBy === 'time') classes.push('is-time');
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="${classes.join(' ')}"><span>${photo.n}</span></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26],
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function popupHtml(photo: MapPhoto): string {
  const note = photo.placedBy === 'time' ? '<small>Plassert etter klokkeslett</small>' : '';
  return `<button type="button" class="pin-card" data-open-lightbox="${escapeHtml(photo.id)}">
    <img src="${escapeHtml(photo.thumb)}" alt="">
    <span>${escapeHtml(photo.caption)}</span>
    ${note}
  </button>`;
}

function setActive(registry: Registry, photoId: string, scrollMap: boolean): void {
  document.querySelectorAll<HTMLElement>('[data-photo-id]').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.photoId === photoId);
  });
  for (const [id, marker] of registry.markers) {
    const photo = registry.photos.get(id);
    if (!photo) continue;
    marker.setIcon(pinIcon(photo, id === photoId));
  }
  if (scrollMap) {
    registry.el.scrollIntoView({
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }
}

function flyTo(registry: Registry, marker: L.Marker): void {
  const target = marker.getLatLng();
  const zoom = Math.max(registry.map.getZoom(), 15);
  const token = ++registry.token;
  const open = () => {
    if (registry.token === token) marker.openPopup();
  };
  if (prefersReducedMotion()) {
    registry.map.setView(target, zoom, { animate: false });
    open();
    return;
  }
  registry.map.flyTo(target, zoom, { duration: 0.75 });
  registry.map.once('moveend', open);
}

function addTiles(map: L.Map, payload: MapPayload): void {
  const topo = L.tileLayer(payload.tiles.topo.url, {
    attribution: payload.tiles.topo.attribution,
    maxZoom: payload.tiles.topo.maxZoom,
  });
  const osm = L.tileLayer(payload.tiles.osm.url, {
    attribution: payload.tiles.osm.attribution,
    maxZoom: payload.tiles.osm.maxZoom,
  });
  topo.addTo(map);
  let errors = 0;
  topo.on('tileerror', () => {
    errors += 1;
    if (errors < 3) return;
    if (!map.hasLayer(osm)) osm.addTo(map);
    if (map.hasLayer(topo)) map.removeLayer(topo);
  });
  L.control
    .layers(
      {
        [payload.tiles.topo.name]: topo,
        [payload.tiles.osm.name]: osm,
      },
      {},
      { collapsed: true },
    )
    .addTo(map);
}

function addTracks(map: L.Map, payload: MapPayload, bounds: L.LatLngBounds): L.FeatureGroup[] {
  return payload.tracks.map((track) => {
    const group = L.featureGroup();
    for (const segment of track.segments) {
      if (segment.length === 0) continue;
      L.polyline(segment, { color: '#f7f4ec', weight: 8, opacity: 0.9 }).addTo(group);
      L.polyline(segment, { color: track.color, weight: 4.5, opacity: 0.95 }).addTo(group);
      for (const [lat, lon] of segment) bounds.extend([lat, lon]);
    }
    if (track.href) {
      group.bindPopup(
        `<a class="track-link" href="${escapeHtml(track.href)}">${escapeHtml(track.label)}</a>`,
      );
    }
    group.addTo(map);
    return group;
  });
}

function seedView(payload: MapPayload): L.LatLngExpression {
  const segment = payload.tracks[0]?.segments.find((line) => line.length > 0);
  if (segment && segment[0]) return segment[0];
  if (payload.photos[0]) return [payload.photos[0].lat, payload.photos[0].lon];
  if (payload.start) return payload.start;
  return [63.52, 9.1];
}

function initMap(el: HTMLElement): void {
  if (el.dataset.ready === '1' || !el.dataset.payload) return;
  const payload = JSON.parse(el.dataset.payload) as MapPayload;
  el.dataset.ready = '1';
  el.replaceChildren();

  const map = L.map(el, {
    scrollWheelZoom: false,
    zoomControl: true,
    // CSS zoom animation can leave tiles stuck at the wrong scale in Chrome.
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  });
  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur', () => map.scrollWheelZoom.disable());
  // A view must exist before vector layers, or the renderer has no clip bounds.
  map.setView(seedView(payload), 12);
  addTiles(map, payload);

  const bounds = L.latLngBounds([]);
  const photos = new Map(payload.photos.map((photo) => [photo.id, photo]));
  const markers = new Map<string, L.Marker>();
  const registry: Registry = { el, map, photos, markers, token: 0 };
  registries.push(registry);

  let tries = 0;
  const draw = () => {
    if (el.dataset.drawn === '1') return;
    map.invalidateSize();
    if (map.getSize().y < 10 && tries < 30) {
      tries += 1;
      requestAnimationFrame(draw);
      return;
    }
    el.dataset.drawn = '1';
    addTracks(map, payload, bounds);
    for (const photo of payload.photos) {
      bounds.extend([photo.lat, photo.lon]);
      const marker = L.marker([photo.lat, photo.lon], {
        icon: pinIcon(photo, false),
        keyboard: true,
        zIndexOffset: 500,
      })
        .bindPopup(popupHtml(photo))
        .addTo(map);
      marker.on('click', () => {
        setActive(registry, photo.id, false);
        window.setTimeout(() => marker.openPopup(), 0);
      });
      markers.set(photo.id, marker);
    }

  if (payload.start) {
    bounds.extend(payload.start);
    L.circleMarker(payload.start, {
      radius: 6,
      color: '#f7f4ec',
      weight: 2,
      fillColor: '#243c28',
      fillOpacity: 1,
    })
      .bindTooltip(payload.loop ? 'Start og slutt' : 'Start', { direction: 'right' })
      .addTo(map);
  }
  if (payload.end && !payload.loop) {
    bounds.extend(payload.end);
    L.circleMarker(payload.end, {
      radius: 6,
      color: '#f7f4ec',
      weight: 2,
      fillColor: '#9a4e2c',
      fillOpacity: 1,
    })
      .bindTooltip('Slutt', { direction: 'right' })
      .addTo(map);
  }

    if (bounds.isValid()) {
      const samePoint = bounds.getNorthEast().equals(bounds.getSouthWest());
      if (samePoint) map.setView(bounds.getCenter(), 14);
      else map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
    }
  };

  map.whenReady(draw);
  map.on('popupopen', (event) => {
    const button = event.popup.getElement()?.querySelector<HTMLButtonElement>('[data-open-lightbox]');
    button?.addEventListener('click', () => {
      const photoId = button.dataset.openLightbox;
      if (!photoId) return;
      window.dispatchEvent(new CustomEvent('jaktlogg:open-lightbox', { detail: { photoId } }));
    });
  });
}

export function mountMaps(): void {
  document.querySelectorAll<HTMLElement>('[data-track-map]').forEach(initMap);
}

window.addEventListener('jaktlogg:focus-photo', (event) => {
  const photoId = (event as CustomEvent<{ photoId?: string }>).detail?.photoId;
  if (!photoId) return;
  for (const registry of registries) {
    const marker = registry.markers.get(photoId);
    if (!marker) continue;
    setActive(registry, photoId, true);
    flyTo(registry, marker);
    break;
  }
});

document.addEventListener('astro:page-load', () => {
  mountMaps();
  mountGallery();
});
mountGallery();
