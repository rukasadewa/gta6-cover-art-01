# Neon Coast Cover Studio — Make GTA 6 Cover Art

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/rukasadewa/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/rukasadewa/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns any photo and a caption into GTA-poster-style
cover art: multi-panel posters, a Vice City sunset / neon colour grade, bold
Anton lettering with a Pacifico script subtitle, exported as a PNG to share.

## What it does

- **Any photo** — upload up to 4 of your own photos, or use the 4 built-in
  samples. Click a panel to select it, drag it to crop, zoom and pan per panel.
- **7 layouts** — Loading Screen (full-bleed hero, title over the photo),
  Vice Grid (hero + two stacked), Tilted Snaps (overlapping snapshots),
  Hero Strip (full-bleed + film strip), Nine Panel (3 × 3 grid), Split Duo,
  and Story Stack.
- **5 colour grades** — Vice Sunset, Neon Night, Palm Teal, Heat Haze, Noir Pop.
- **Lettering** — title in Anton with a sunset-gradient fill and ink outline,
  script subtitle with a neon glow, a tilted badge ribbon, and a 5-star heat
  meter. Halftone dots, hand-drawn palm silhouettes, film grain, vignette.
- **3 title styles** — Sunset Gradient, Chrome (silver-blue metal) and Neon
  Outline (glowing outline only). The style applies to the title in every
  layout.
- **Decor stamps** — hand-drawn doodle stamps (sun, palm, lightning, sparkle
  star) you can drop on the cover, drag to move, resize, tilt or remove.
  Drawn with canvas paths in the app itself.
- **Fast and easy** — photo to PNG in a few clicks, in 1080 × 1080,
  1080 × 1350 and 1920 × 1080, plus an "Export all 3 sizes" button and
  undo/redo and a "Surprise me" randomizer.
- **Offline** — static files under `app/`, no network request. Fonts
  (Anton, Pacifico, Bebas Neue) are vendored under `app/fonts/` under the
  SIL Open Font License. Photos never leave the machine. No Rockstar logo,
  artwork or font is used anywhere.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand-in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library.

## How the screenshots were made

`shots.json` lists four fixed scenes, each a URL query for the app
(`?shot=cover` for a bare cover, `?shot=editor` for the editor itself).
The first is the Loading Screen layout in wide 1920 × 1080 with a Chrome
title and three decor stamps — the poster's strongest face.

## License

MIT — see [LICENSE](LICENSE). Fonts under `app/fonts/` are under the SIL
Open Font License 1.1 (texts beside them).
