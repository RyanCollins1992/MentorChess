---
name: react19-no-unmount-warning
description: React 19 doesn't console.error/throw on setState-after-unmount — can't test isMounted guards via "does it warn/throw", must assert on an observable side effect instead
metadata:
  type: feedback
---

React 19 removed the "Cannot update a component while unmounted" console.error warning that older React versions emitted for setState calls on an unmounted component's fiber — calling a state setter after unmount is now a silent no-op.

**Why this matters:** when writing a test to verify an `isMounted`/`AbortController` guard actually works (e.g. guarding setState in an async callback after a component unmounts), `expect(() => triggerLateCallback()).not.toThrow()` and `expect(consoleErrorSpy).not.toHaveBeenCalled()` will BOTH pass whether or not the guard exists — they prove nothing. Discovered while testing [[project-mentorchess-overview]]'s VsCoachPage unmount guard: a test using either approach passed identically against the guarded and the deliberately-unguarded version of the code.

**How to apply:** to actually prove an unmount guard works, assert on an observable side effect of the guarded code path itself — e.g., a mock dependency (worker/fetch/timer) that the guarded branch would call if it ran, and assert that call never happens after unmount. Don't rely on React's console output or thrown errors as the signal.
