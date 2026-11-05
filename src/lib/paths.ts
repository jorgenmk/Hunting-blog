import path from 'node:path';

export const repoRoot = process.cwd();
export const daysDir = path.join(repoRoot, 'src', 'content', 'days');
export const mediaDir = path.join(repoRoot, 'public', 'media');
export const manifestPath = path.join(repoRoot, 'src', '.generated', 'days.json');
