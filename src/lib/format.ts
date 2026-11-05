export function formatDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatClock(iso: string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(iso));
}

export function formatDistance(meters: number, locale: string): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

export function formatElevation(meters: number, locale: string): string {
  return `${Math.round(meters).toLocaleString(locale)} m`;
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} t`;
  return `${hours} t ${minutes} min`;
}

export function formatList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} og ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`;
}

export function seasonFor(
  isoDate: string,
  startMonth: number,
): { key: string; label: string } {
  const [year, month] = isoDate.split('-').map(Number);
  const startYear = month >= startMonth ? year : year - 1;
  const end = String(startYear + 1).slice(-2);
  return { key: String(startYear), label: `Jaktsesong ${startYear}/${end}` };
}

/** `01-utsikt-fra-ryggen.jpg` → `Utsikt fra ryggen`. */
export function captionFromFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '');
  const stripped = base.replace(/^\d+[\s._-]*/, '');
  const words = stripped.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!words) return 'Bilde';
  return words.charAt(0).toLocaleUpperCase('nb-NO') + words.slice(1);
}
