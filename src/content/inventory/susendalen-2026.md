# Susendalen 2026 inventory

Migrated from the single article [Susendalen 2026](https://turer.kvalvaag.org/posts/susendalen_2026/) on Turbloggen (published 2026-09-20). The old site has no separate URL per day. The four sections below are the `h4` headings on that page, in order.

The source page lists all three GPX files once, under the whole article, not under a day heading. Track assignment below follows the timestamps inside each GPX file (Europe/Oslo) and the place names in the text.

Sliding every track forward one folder would put a 15 September track on the 16 September page, and so on. The timestamps contradict that. The place names do match if the prose moves back one calendar day instead: the only track that goes west toward Drakontinden is 15 September, the 16 September track and photos sit on Laenjiengielese, and the 17 September track and photos reach Galperetinden. Dag 0 is the drive from Værnes on 14 September and has no track. 18 September is the drive home, titled "På tur hjem", and has no GPX.

Coordinates come from EXIF in the downloaded image files. The old page also embeds the same positions as Leaflet markers (`L.latLng` in the page script). Those markers match the EXIF GPS within 0.00001 degrees. Nothing was added where EXIF or the GPX file did not already have a position.

The old gallery has no per-photo captions. Files keep the original names, prefixed so alphabetical order matches the gallery order on the source page.

## Days

| Folder | Source heading | Photos | Track |
| --- | --- | --- | --- |
| `2026-09-14-susendalen-forberedelse` | Dag 0 Forberedelse og camp | 0 | none |
| `2026-09-15-susendalen-drakontinden` | Dag 1 Jakt mot Drakontinden | 2 | `activity_24411539900.gpx` |
| `2026-09-16-susendalen-rundt-camp` | Dag 2 Lett marsj i området rundt camp | 6 | `2026-09-16-08-13-55.gpx` |
| `2026-09-17-susendalen-galperetinden` | Dag 3 Jakt i området rundt Galperetinden | 7 | `2026-09-17-08-47-54.gpx` |
| `2026-09-18-susendalen-pa-tur-hjem` | På tur hjem (not a heading on the source page) | 7 | none |

22 photos and 3 tracks in total. Every photo's EXIF date matches its folder date. Dag 0 has no photos.

Dag 0 is 14 September 2026: the group met at Værnes around 10:00 and drove to Harvassdalen. That page has no GPX. The only track on 15 September starts at 07:58 in the mountains, and the two photos that morning are on that walk, so that track stays with Dag 1.

`IMG_5557.jpeg` is 18 September at 17:42 with GPS about 63.29N 9.70E, on the drive home. It stays on "På tur hjem" with the other photos from that date.

## Tracks

| File | Source | Oslo time | Where it goes | Points |
| --- | --- | --- | --- | --- |
| `activity_24411539900.gpx` | https://turer.kvalvaag.org/posts/susendalen_2026/activity_24411539900.gpx | 15 Sep 07:58–16:43 | West to about 65.277N 14.326E, toward Drakontinden (65.260N 14.330E). File name: Hattfjelldal Fotturer. | 206 |
| `2026-09-16-08-13-55.gpx` | https://turer.kvalvaag.org/posts/susendalen_2026/2026-09-16-08-13-55.gpx | 16 Sep 08:14–15:12 | South to Laenjiengielese (65.304N 14.395E). | 128 |
| `2026-09-17-08-47-54.gpx` | https://turer.kvalvaag.org/posts/susendalen_2026/2026-09-17-08-47-54.gpx | 17 Sep 08:48–17:22 | South to Galperetinden (65.272N 14.408E). | 210 |

Each file is one `<trk>` with one `<trkseg>`. No day has more than one of these files.

## Photos

Gallery index is the order on the source page. The largest file linked from that page was downloaded (the `href` on each gallery item, not the 150px thumbnail).

| # | File | EXIF time (+02:00) | EXIF GPS |
| --- | --- | --- | --- |
| 00 | IMG_0327.JPEG | 2026-09-15 10:35:05 | 65.28496, 14.37622 |
| 01 | IMG_0329.JPEG | 2026-09-15 11:13:21 | 65.28026, 14.34947 |
| 02 | IMG_0333.JPEG | 2026-09-16 09:43:04 | 65.30524, 14.39991 |
| 03 | IMG_0334.JPEG | 2026-09-16 09:43:36 | 65.30524, 14.39990 |
| 04 | IMG_0335.JPEG | 2026-09-16 11:11:10 | 65.30441, 14.38565 |
| 05 | IMG_0337.JPEG | 2026-09-16 12:51:02 | 65.29786, 14.39684 |
| 06 | IMG_5520.jpeg | 2026-09-16 13:29:25 | 65.31119, 14.43404 |
| 07 | IMG_5522.jpeg | 2026-09-16 15:03:26 | 65.31212, 14.42147 |
| 08 | IMG_0338.JPEG | 2026-09-17 10:16:26 | 65.28513, 14.43060 |
| 09 | IMG_0340.JPEG | 2026-09-17 10:31:46 | 65.28086, 14.43374 |
| 10 | IMG_0345.JPEG | 2026-09-17 12:17:51 | 65.27318, 14.42156 |
| 11 | IMG_0347.JPEG | 2026-09-17 12:58:18 | 65.27318, 14.42155 |
| 12 | IMG_5534.jpeg | 2026-09-17 13:18:28 | 65.27154, 14.42038 |
| 13 | IMG_0349.JPEG | 2026-09-17 13:43:53 | 65.26492, 14.41235 |
| 14 | IMG_5537.jpeg | 2026-09-17 13:55:47 | 65.26959, 14.41177 |
| 15 | IMG_0354.JPEG | 2026-09-18 06:12:52 | 65.31208, 14.42120 |
| 16 | IMG_5545.jpeg | 2026-09-18 06:36:59 | 65.31208, 14.42115 |
| 17 | IMG_5550.jpeg | 2026-09-18 07:09:06 | 65.31209, 14.42127 |
| 18 | IMG_0356.JPEG | 2026-09-18 07:09:26 | 65.31203, 14.42131 |
| 19 | IMG_0359.JPEG | 2026-09-18 07:36:54 | 65.31214, 14.42141 |
| 20 | IMG_5553.jpeg | 2026-09-18 07:52:19 | 65.31210, 14.42136 |
| 21 | IMG_5557.jpeg | 2026-09-18 17:42:50 | 63.28722, 9.69630 |

Image URLs are `https://turer.kvalvaag.org/posts/susendalen_2026/images/<filename>`.

`IMG_5557.jpeg` is in the source gallery and on its map. The coordinates are about 63.29N 9.70E, far from the other Susendalen points, because it was taken on the drive home. It stays with the other 18 September photos.

The old article's social image and gallery background is `IMG_0356.JPEG`. Here the cover of each day is the first photo in source gallery order for that date, so 18 September's cover is `IMG_0354.JPEG`.

## Not migrated

- No GPX on the source page has timestamps on 2026-09-18.
- No per-photo captions exist on the source page.
- Other trips linked from the home page and from "See also" (Børgefjell 2021 and 2022) are not part of this page.
- The article's published date, 2026-09-20, is not a fifth day and has no photos or track of its own.
