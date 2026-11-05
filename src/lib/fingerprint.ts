import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { daysDir } from './paths.ts';

/** Changes when any file in a day folder changes. Ignores generated output. */
export function fingerprintSources(): string {
  if (!existsSync(daysDir)) return 'missing';
  const parts: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith('.')) continue;
      const full = path.join(dir, name);
      const info = statSync(full);
      if (info.isDirectory()) walk(full);
      else parts.push(`${path.relative(daysDir, full)}:${info.size}:${Math.round(info.mtimeMs)}`);
    }
  };
  walk(daysDir);
  return parts.join('|');
}
