---
name: mentorchess-sm2-quality-scale
description: SpacedReviewPage only offers 3 rating buttons (Hard=1, Good=2, Easy=3) but SpacedRepetitionEngine._applyAlgorithm treats any quality < 2 as a full failure (resets repetitions to 0, interval to 1 day) — meaning "Hard" is scheduled identically to a total miss.
metadata:
  type: project
---

`src/core/SpacedRepetitionEngine.js`'s `_applyAlgorithm(card, quality)`: `if (quality < 2) { repetitions = 0; interval = 1 }`. `src/pages/SpacedReviewPage.jsx`'s `RateCard` only exposes three buttons mapped to quality 1 ("Hard"), 2 ("Good"), 3 ("Easy") — there is no quality-0 button. This means tapping "Hard" (quality=1) is bucketed into the same fail-branch as a genuine quality-0 miss, fully resetting a card's progress (repetitions→0, interval→1 day) even though the user remembered the trap, just with difficulty.

Confirmed by simulating the algorithm directly on 2026-06-20: a card with `repetitions=2, interval=6` rated "Hard" (quality=1) produces `{interval:1, repetitions:0}` — identical in kind to what a true failure produces. Standard SM-2 treats quality>=3 (on a 0-5 scale) as passing; this app's quality<2-as-fail threshold combined with a UI that starts its scale at 1 effectively makes the lowest available UI choice ("Hard") a full reset.

**Why:** The task brief that originally triggered this finding noted the SM-2 engine was changed same-day to consume a difficulty rating — this 1-vs-2 threshold mismatch is exactly the kind of off-by-one regression that change could introduce, and it directly punishes the "Hard but remembered" case that spaced repetition is supposed to handle gently (shorter interval, not full reset).

**How to apply:** Flag this as a major bug/regression risk whenever SRS/SM-2 logic changes in this repo. Suggested fix direction: either change the failure threshold to `quality < 1` (so only a true 0 resets), or add a true 4th "Fail/Forgot" button distinct from "Hard" so quality 1 is not conflated with quality 0.
