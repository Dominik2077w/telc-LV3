# telc LV2/LV3 Trainer

A small PWA trainer for telc C1 Hochschule LV2 and LV3 practice.

## Features

- Choose LV2 or LV3 on entry
- Practice by `Teil`
- LV2 paragraph flashcards with Abschnitt, first sentence, summary, and linked question items
- Sequential or random order between `Teil`
- Sequential or random order inside each `Teil`
- Mistake-only repeat rounds until every question is correct
- Exam-like front side with German only
- Review back side with answer, German, and Chinese
- GitHub Pages deployment
- Offline support through a service worker

## Commands

```bash
npm run extract:lv2 -- /path/to/LV2-cleaned.xlsx --output data/lv2_questions.js
npm run extract
npm run check
npm run build
```

`npm run build` outputs the deployable app to `dist/`.

## GitHub Pages

This repository includes `.github/workflows/pages.yml`. Enable GitHub Pages with `GitHub Actions` as the source, then push to `main`.

## iOS Install

Open the GitHub Pages URL in iOS Safari, tap Share, then choose Add to Home Screen.
