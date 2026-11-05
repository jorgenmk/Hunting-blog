import { spawnSync } from 'node:child_process';
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

const root = fileURLToPath(new URL('.', import.meta.url));

function runNode(script, args = []) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', path.join(root, script), ...args],
    { cwd: root, stdio: 'inherit' },
  );
  if (result.status !== 0) {
    throw new Error(`${script} failed`);
  }
}

export default defineConfig({
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [
    {
      name: 'jaktloggen-days',
      hooks: {
        'astro:config:done': () => {
          runNode('scripts/prepare-days.ts');
        },
        'astro:build:done': ({ dir }) => {
          const dist = dir instanceof URL ? fileURLToPath(dir) : String(dir);
          const media = path.join(root, 'public', 'media');
          if (existsSync(media)) {
            cpSync(media, path.join(dist, 'media'), { recursive: true });
          }
          runNode('scripts/check-published-exif.ts', [dist]);
        },
      },
    },
  ],
});
