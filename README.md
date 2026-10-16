# telc LV2/LV3/HV Trainer

A local PWA-style trainer for telc C1 Hochschule practice.

## Features

- Choose LV2, LV3, HV1, or HV2 on entry
- Practice by `Teil`
- Sequential or random order between `Teil`
- Sequential or random order inside each `Teil`
- Mistake-only repeat rounds until every question is correct
- Exam-like front side with German only
- Review back side with answer, German, and Chinese
- Offline support through a service worker after the local page has loaded

## September 2026 Corpus

The existing LV2, LV3, HV1, HV2, Baustein, speaking, and writing modules include the reviewed September PDF update. New exercises show a green **2026.9 新增** badge. Select **只练 2026.9 新增** to practice only those records, including additions inside existing sections. Sources with answers but missing options or audio use review cards.

See [the update notes](docs/corpus-2026-09.md) for counts, source limitations, corrections, and reproducible import commands. LV2 version 2 and the grammar cards retain their existing curated content.

## Local Commands

```bash
npm run serve
```

Open:

```text
http://localhost:4173/index.html
```

Useful maintenance commands:

```bash
npm run check
npm run build
npm run extract:hv2
npm run extract:lv2 -- /path/to/LV2-cleaned.xlsx --output data/lv2_questions.js
npm run extract
```

`npm run build` outputs a local production copy to `dist/`.

## GitHub Pages

Live app: [telc Trainer](https://dominik2077w.github.io/telc-LV3/)

Pushing to `main` runs `.github/workflows/pages.yml`: it validates the corpus, builds `dist/`, and deploys that folder to GitHub Pages. The repository's Pages publishing source is GitHub Actions.

The published build includes the question data and review cards. Local audio assets are excluded; HV1 falls back to the available text. Original PDFs and local source paths are not included in the published site.

## iOS Local Use

Open the GitHub Pages link in Safari to use the hosted app. For local testing from another device, run a local server on the machine that hosts this folder and open the machine's LAN address in Safari.
