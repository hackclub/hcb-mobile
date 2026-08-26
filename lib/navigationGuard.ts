import { router } from "expo-router";

/**
 * Prevents duplicate screens from stacking up when a button is tapped multiple
 * times in quick succession. A navigation transition takes a few hundred ms to
 * mount, so a second `push`/`navigate` that fires inside that window is almost
 * always an accidental double-tap rather than an intentional navigation.
 *
 * We patch the shared `router` singleton once at startup so every call site
 * (`router.push(...)`, `router.navigate(...)`) is guarded automatically, with
 * no changes needed at the ~25 places that navigate.
 */

// How long to swallow follow-up navigations after one goes through.
const GUARD_WINDOW_MS = 800;

let lastNavAt = 0;

let installed = false;

export function installNavigationGuard() {
  if (installed) return;
  installed = true;

  const guard = <Args extends unknown[]>(
    original: (...args: Args) => void,
  ): ((...args: Args) => void) => {
    return (...args: Args) => {
      const now = Date.now();
      if (now - lastNavAt < GUARD_WINDOW_MS) {
        // Too soon after the previous navigation — treat as a double-tap.
        return;
      }
      lastNavAt = now;
      return original(...args);
    };
  };

  // Only `push` and `navigate` add screens to the stack, so those are the ones
  // that produce duplicate screens. `replace`, `back`, `dismiss`, etc. are left
  // untouched.
  const originalPush = router.push.bind(router);
  const originalNavigate = router.navigate.bind(router);

  router.push = guard(originalPush) as typeof router.push;
  router.navigate = guard(originalNavigate) as typeof router.navigate;
}
