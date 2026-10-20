# Mobile layout validation

The October 2026 phone layout uses the same question data, scoring, and repeat-round logic as the desktop app. The responsive breakpoint is 850 CSS pixels.

## Browser checks

Checked with browser viewport overrides, rather than physical iOS or Android devices:

- 360×640: all nine module entries fit the compact chooser; settings scroll independently with the start button available; LV3 answers, flip, next question, and the September additions filter work.
- 320×568: native matching controls fit without horizontal page overflow; LV2 version 2 distinguishes repeated paragraph letters by including the signal word. Submission marks unanswered items and shows corrections.
- 320×568: Baustein keeps the current blank above the bottom panel; selecting advances to the next blank; collapsing and reopening from a blank work; submitting removes the panel, shows scored review rows, and resets correctly for the next article.
- 320×568: writing-card review keeps both recall actions accessible; marking a card forgotten records a mistake and advances; next cards return to the top.
- The October 19 HV1 selection-based matching checks were superseded by the October 20 memory and drag-order flow described below.
- 667×375 landscape: settings retain a visible close and start button; Baustein puts four options in one row and keeps the current blank above the panel.
- Settings support Escape, return focus to the settings trigger, and make the background inert while open. The module chooser allows returning to an active exercise.

The local build and published site use the same relative asset URLs. The published build continues to omit local audio assets.

## October 20 HV1 flow

- 360×640: shows all eight correct statements before readiness; starting shuffles the entire list and removes the memory list. Dragging a handle changes positions; keyboard arrows also reorder items.
- A submitted first-two-item swap scores 6/8, preserves the submitted order, marks those two positions wrong, and shows a separate eight-item correct list. The next Teil opens in the memory stage.
- 320×568: new-corpus sections retain their badge, show eight statements in speaker order, and fit without horizontal overflow. A 1280-pixel desktop resize retains the active ordering.
- Single-Teil mistake mode returns to memory in round 2 after an incorrect attempt; an 8/8 attempt then completes the round. LV2 version 2 was also checked. The former individual-matching mode has since been replaced by review cards using the authoritative PDF statements.
- Native pointer events handle dragging; only the handle blocks touch scrolling. The sentence area remains available for reading and ordinary scrolling.
- `npm run check:hv1` covers all twenty supported source sections, correct speaker order, unknown-answer fallback, shuffling, boundary moves, partial and perfect scoring, and fresh repeat sessions.

## October 20 authoritative HV1 source refresh

- 360×640: Teil 13 shows eight PDF statements, its revision badge, and the original `zu...` truncation note. A real handle drag changes the position; submission retains eight result rows and the source notes without horizontal overflow.
- The PDF-based review mode displays the printed answer letter and Chinese translation. Teil 13 / Sprecher 8 shows the corrected positive meaning and explains the source's duplicated Chinese line.
- Mode's ten A–J statements use unscored review cards and explicitly state that the PDF has no speaker-order answer.
