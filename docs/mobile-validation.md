# Mobile layout validation

The October 2026 phone layout uses the same question data, scoring, and repeat-round logic as the desktop app. The responsive breakpoint is 850 CSS pixels.

## Browser checks

Checked with browser viewport overrides, rather than physical iOS or Android devices:

- 360×640: all nine module entries fit the compact chooser; settings scroll independently with the start button available; LV3 answers, flip, next question, and the September additions filter work.
- 320×568: native matching controls fit without horizontal page overflow; LV2 version 2 distinguishes repeated paragraph letters by including the signal word. Submission marks unanswered items and shows corrections.
- 320×568: Baustein keeps the current blank above the bottom panel; selecting advances to the next blank; collapsing and reopening from a blank work; submitting removes the panel, shows scored review rows, and resets correctly for the next article.
- 320×568: writing-card review keeps both recall actions accessible; marking a card forgotten records a mistake and advances; next cards return to the top.
- 390×844: HV1 matching clears a duplicate assignment and displays the selected sentence in full; submitting shows corrections. Switching to a 1280-pixel desktop layout and back preserves assignments.
- 667×375 landscape: settings retain a visible close and start button; Baustein puts four options in one row and keeps the current blank above the panel.
- Settings support Escape, return focus to the settings trigger, and make the background inert while open. The module chooser allows returning to an active exercise.

The local build and published site use the same relative asset URLs. The published build continues to omit local audio assets.
