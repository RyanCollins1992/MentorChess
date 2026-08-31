---
name: mentorchess-rating-counts
description: RateDifficultyPage toggles a trap's star rating to 0 (not delete) when un-starring, so Object.keys(ratings).length-based "rated" counters overcount — the trap shows 0 stars in the UI but still counts toward "X/Y rated".
metadata:
  type: project
---

`src/pages/RateDifficultyPage.jsx`'s `TrapRateRow` calls `onRate(trap.id, rating === star ? 0 : star)` to toggle a star off, which calls `saveRating` → stores `ratings[trapId] = 0` in the `ratings` object (never deletes the key). The "Unrated" filter correctly uses `!r` (falsy check, so 0 counts as unrated) — but the header's `ratedCount = Object.keys(ratings).length` counts every key ever touched, including ones now rated 0. Confirmed 2026-06-20: rate a trap Hard (3 stars), toggle off (click 3rd star again) — localStorage shows `{"trap-id":0}`, display still reads "1/N rated" instead of "0/N".

Note: this does NOT affect SRS scheduling — `srsEngine.setRating(trapId, 0)` stores `rating: 0` on the card, and `SpacedRepetitionEngine._applyAlgorithm` checks `if (card.rating)` which is falsy for 0, so the ease-factor nudge is correctly skipped. Only the cosmetic "rated" counter/progress-bar percentage on this page is wrong.

**Why:** Easy to miss because the star UI itself looks correct (0 stars shown) and the filter logic is correct — only the aggregate count is stale. Visual hover-state can also create false impressions in screenshots (stars showing colored when mouse cursor is lingering nearby) — always move the mouse away and re-screenshot, or check localStorage directly, before concluding a rating bug.

**How to apply:** Suggested fix direction for coding agent: in `saveRating`, when `stars === 0`, delete the key from the ratings object instead of setting it to 0 (`const next = {...ratings}; if (stars === 0) delete next[trapId]; else next[trapId] = stars`).
