# Jaktloggen

Static hunting log. One folder per day becomes one page: text, a map of the Garmin track, and a photo gallery with pins. There is no backend.

The site title lives in [`src/config.ts`](src/config.ts) (`title`). Change it there.

## Deploy on Cloudflare Pages

Use the static build. Do not add `@astrojs/cloudflare` or any server adapter.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | repository root |
| Node.js | 22 (`NODE_VERSION=22` if the project default is older) |
| Environment variables | none |

Pages installs dependencies, runs the build, and publishes `dist`. Resized images are created during the build. They are not committed.

Production branch is whatever you connect in Pages, usually `main`.

## Local development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

`npm run build` writes `dist`. `npm run preview` serves that folder. `npm test` checks the GPX, distance, and photo-time helpers.

## How to add a day

Adding a day means creating one folder. Do not edit routes, the map, or coordinates by hand. Do not put latitude or longitude in the markdown.

1. Create a directory:

   `src/content/days/YYYY-MM-DD-short-slug/`

   - `YYYY-MM-DD` is the calendar date of the hunt.
   - `short-slug` is lowercase ASCII: `a-z`, `0-9`, and hyphens. Example: `2026-10-12-hitra-eksempel`.
   - The date in the folder name must match `date` in `index.md`.

2. Add `index.md` in that folder, saved as UTF-8. Start with this frontmatter (Norwegian text is fine in the body):

   ```yaml
   ---
   title: Kort tittel på dagen
   date: 2026-10-12
   participants:
     - Ola Nordmann
     - Kari Nordmann
   area: Hitra
   summary: Én setning som vises på forsiden.
   ---
   ```

   Then write the day in Markdown under the frontmatter.

   - `title` (required): plain text.
   - `date` (required): `YYYY-MM-DD`, the same date as the folder.
   - `participants` (optional): a YAML list. Omit the key if you do not know who was there.
   - `area` (optional): place name, plain text.
   - `summary` (optional): one plain-text sentence for the index. No Markdown.
   - Do not embed pictures with `![](...)`. Photos in the folder are picked up on their own. An embedded file would be copied with its original EXIF, and the build is set up to fail if a published image still has GPS.

3. Add the Garmin GPX files. Any name ending in `.gpx` is fine, and a day may contain more than one. Each file is drawn as its own track and is not joined to the next. A day with no `.gpx` still builds, without distance or time stats. Export the track the watch already recorded (`<trk>` / `<trkpt>`, with `<ele>` and `<time>` when the watch stored them). Do not draw a replacement track.

4. Add the photos next to `index.md`. JPEG is the safe choice. PNG, WebP, and HEIC are also accepted. If the build cannot decode a HEIC file, convert that file to JPEG and replace it.

   Name files so alphabetical order is the order they should appear. The first file is the cover on the index and photo 1 on the map.

   ```text
   01-bekken.jpg
   02-utsikt-fra-ryggen.jpg
   03-i-lia.jpg
   ```

   The caption is the filename without the leading number and the extension (`02-utsikt-fra-ryggen.jpg` becomes "Utsikt fra ryggen").

   Leave the camera EXIF in the files you commit:

   - GPS (`GPSLatitude` / `GPSLongitude`) becomes the map pin.
   - If GPS is missing but `DateTimeOriginal` (or `CreateDate`) is present, the build places the photo on the GPX track by time.
   - Camera clocks are usually Norwegian local time. GPX times are UTC. Do not convert either; the build tries both and keeps the reading that lands on the track. If both fit, it uses `Europe/Oslo` (see `photoTimeZone` in `src/config.ts`). An EXIF offset such as `+02:00` is used as given.
   - A photo with neither GPS nor a usable time is shown in the gallery and has no pin.

5. Do not edit any other project file for a normal day.

6. From the repository root, run `npm run build`. The new page is `/dag/YYYY-MM-DD-short-slug/`.

Days are grouped into a hunting season that starts on 1 August (`seasonStartMonth` in `src/config.ts`). 12 October 2026 and 4 January 2027 both belong to "Jaktsesong 2026/27".

## Sample day

`src/content/days/2026-10-12-hitra-eksempel/` is fake: a generated track near Hitra (about 63.52N, 9.10E) and drawn JPEGs stamped `EKSEMPELDATA`. Three of them have GPS. `04-uten-gps.jpg` has only a timestamp, so the build places that pin from the GPX. Delete that whole folder to remove the sample. Leave `src/content/days/` in place.

Regenerate it (this overwrites that folder) with:

```bash
npm run generate-sample
```

## What the build does

For each day folder the build:

- reads the GPX track (one or more segments)
- sums distance, elevation gain (changes under 2 m are treated as noise), start time, end time, and duration
- reads EXIF GPS and time from each photo and, when GPS is missing, matches the time to the track
- writes a resized WebP (max 1600 px) and a thumbnail (max 720 px) to `public/media/`
- strips metadata from those published files, including GPS
- checks `dist` afterwards and fails the build if any published image still contains GPS

The map uses [Kartverket topo](https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png) as the base layer and OpenStreetMap if those tiles fail. Both can be switched from the layer control. Attribution is on the map.

On a day page, a photo pin opens a thumbnail. Choosing a photo in the gallery highlights that pin and moves the map to it. "Forstørr" opens the lightbox. Photos placed by time are marked "Plassert etter klokkeslett".

## Layout

```text
src/config.ts                 site title, season start, map tiles, image sizes
src/content.config.ts         markdown frontmatter schema
src/content/days/<folder>/    one hunting day: index.md, one .gpx, photos
src/lib/                      GPX, EXIF, stats, image preparation
src/pages/index.astro         newest days, grouped by season, overview map
src/pages/dag/[slug].astro    one day
scripts/prepare-days.ts       build step that reads folders
scripts/generate-sample.ts    rewrites the sample day
scripts/check-published-exif.ts
```

## Privacy

Published images are resized WebP files without EXIF. The pins are the only location the website shows.

The originals in `src/content/days/` keep their EXIF, because the next build reads GPS from them. A public git repository still contains those coordinates. Use a private repository for real hunts.

## GitHub Actions

`.github/workflows/build.yml` runs `npm ci` and `npm run build` on pull requests. It does not deploy and needs no secrets.
