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

## iOS Local Use

When testing from another device, run a local server on the machine that hosts this folder and open the machine's LAN address in Safari. The app is intended for local use only.
