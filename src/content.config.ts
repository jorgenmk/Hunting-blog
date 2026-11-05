import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const isoDate = z.preprocess((value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  return value;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'));

const days = defineCollection({
  loader: glob({
    pattern: '**/index.md',
    base: './src/content/days',
    generateId: ({ entry }) => entry.replace(/\\/g, '/').replace(/\/index\.md$/i, ''),
  }),
  schema: z.object({
    title: z.string().min(1),
    date: isoDate,
    participants: z.array(z.string().min(1)).optional(),
    area: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
  }),
});

export const collections = { days };
