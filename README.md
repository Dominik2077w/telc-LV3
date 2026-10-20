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

The existing LV2, LV3, HV1, HV2, Baustein, speaking, and writing modules include the reviewed September PDF update. New exercises show a green **2026.9 新增** badge. Select **只练 2026.9 新增** to practice only those records, including additions inside existing sections. Sources with answers but missing options or audio use review cards, except HV1 sections with eight known speaker answers, which also support the order practice below.

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
npm run check:hv1
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

## Phone Layout

Screens up to 850 CSS pixels use a compact practice layout. Choose a module, select the desired sections in **题组 / 设置**, then use the always-visible **开始练习** button. Settings close during practice and can be reopened from the top bar. The module button opens the module chooser without discarding the current exercise until a module is selected.

LV2 global matching and LV2 version 2 use native selection controls on phones; selected text and corrections wrap in the card. HV1 uses the drag handles described below. Baustein articles have a bottom option panel that can be collapsed for reading, and tapping a blank returns to its options. Review and matching actions stay near the bottom of the viewport while reading. The **2026.9 新增** badges and filter are available in the phone layout.

Browser checks cover 320×568, 360×640, 390×844, landscape, and a 1280-pixel desktop viewport. See [the mobile validation notes](docs/mobile-validation.md).

## HV1: Memorize, Reorder, Review

The default HV1 mode first shows all eight statements in correct speaker order. Click **准备好了，开始排序** to hide the answer and shuffle all eight together. Drag the **⠿** handle to reorder them vertically; the list scrolls near screen edges. The sentence area remains scrollable on phones. Arrow buttons and the up/down keyboard keys on a focused handle offer precise movement.

**提交排序** scores each position, retains your submitted order, and shows both individual feedback and the complete correct order below. A wrong Teil returns to the memory stage in mistake-repeat mode. Clicking **下一 Teil** starts the next section's memory stage. The old individual matching mode remains available in settings.

Twenty sections have eight known answers and support this flow, including the September additions without audio. Correct order follows speaker numbers, never the letters attached to answer choices. Teil 17 (Mode und Trends / Modebranche) has ten statements but no speaker-answer mapping, so it remains a review-card section.
