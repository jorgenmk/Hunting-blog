import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fingerprintSources } from './fingerprint.ts';
import { manifestPath, repoRoot } from './paths.ts';
import type { Manifest } from './types.ts';

function readManifest(): Manifest {
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
}

export function loadManifest(): Manifest {
  const fingerprint = fingerprintSources();
  if (existsSync(manifestPath)) {
    const current = readManifest();
    if (current.fingerprint === fingerprint) return current;
  }
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', path.join(repoRoot, 'scripts', 'prepare-days.ts')],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  if (result.status !== 0) {
    throw new Error('Preparing day folders failed. See the log above.');
  }
  return readManifest();
}
