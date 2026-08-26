/**
 * Toasts — transient progress, confirmations and failures.
 *
 * The API is imperative and hook-free on purpose: half the call sites are
 * outside React (`utils/cardActions.ts`, the functions `withOfflineCheck`
 * returns in `lib/useOffline.ts`), so `show` has to work from a plain module.
 * `ToastHost` registers itself here on mount and the queue drains into it.
 *
 * Toasts are keyed by id and upserted, which is what makes a single toast able
 * to travel from "Uploading…" to "Uploaded" in place instead of stacking two
 * unrelated cards. `toast.promise` wires that up for you and is the preferred
 * entry point for anything that takes long enough to need a spinner.
 *
 * For anything the user must acknowledge or decide, use `showAlert` from
 * `lib/alertUtils` instead — toasts disappear on their own and must never be
 * the only place an error is reported.
 */

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastOptions {
  type?: ToastType;
  title: string;
  /** Optional second line. Toasts render fine without it. */
  message?: string;
  /**
   * Milliseconds on screen. Defaults to 4s, 6s for errors. Ignored for
   * `loading`, which stays until updated or dismissed (see LOADING_SAFETY_MS).
   */
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  duration: number;
  /**
   * Bumped on every update to the same id. The host uses it to restart its
   * dismiss timer and replay the icon transition without remounting the card.
   */
  revision: number;
}

const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;
// A loading toast whose caller never settles it would otherwise sit on screen
// forever and hold a slot. `toast.promise` always settles; this is the backstop
// for hand-rolled `toast.loading()` calls.
const LOADING_SAFETY_MS = 30000;

type Listener = (toast: ToastItem) => void;
type DismissListener = (id: string) => void;

let showListener: Listener | null = null;
let dismissListener: DismissListener | null = null;
let dismissAllListener: (() => void) | null = null;

// Toasts raised before the host mounts (e.g. during startup) wait here rather
// than being dropped.
let pending: ToastItem[] = [];

let counter = 0;
const revisions = new Map<string, number>();

/** Called by ToastHost on mount. Not part of the public API. */
export function registerToastHost(handlers: {
  onShow: Listener;
  onDismiss: DismissListener;
  onDismissAll: () => void;
}): () => void {
  showListener = handlers.onShow;
  dismissListener = handlers.onDismiss;
  dismissAllListener = handlers.onDismissAll;

  if (pending.length) {
    const queued = pending;
    pending = [];
    queued.forEach(handlers.onShow);
  }

  return () => {
    if (showListener === handlers.onShow) showListener = null;
    if (dismissListener === handlers.onDismiss) dismissListener = null;
    if (dismissAllListener === handlers.onDismissAll) dismissAllListener = null;
  };
}

function durationFor(type: ToastType, explicit?: number): number {
  if (type === "loading") return LOADING_SAFETY_MS;
  if (explicit != null) return explicit;
  return type === "error" ? ERROR_DURATION : DEFAULT_DURATION;
}

function upsert(id: string, options: ToastOptions): string {
  const type = options.type ?? "info";
  const revision = (revisions.get(id) ?? 0) + 1;
  revisions.set(id, revision);

  const item: ToastItem = {
    ...options,
    id,
    type,
    revision,
    duration: durationFor(type, options.duration),
  };

  if (showListener) {
    showListener(item);
  } else {
    // Collapse queued updates to the same id so a loading→success transition
    // that happens before mount arrives as one final toast, not two.
    pending = [...pending.filter((t) => t.id !== id), item];
  }
  return id;
}

function nextId(): string {
  counter += 1;
  return `toast-${counter}`;
}

export const toast = {
  /** Show a toast. Returns its id, which you can pass to `update`/`dismiss`. */
  show: (options: ToastOptions) => upsert(nextId(), options),

  /** Replace a toast in place — same card, new type/text, timer restarted. */
  update: (id: string, options: ToastOptions) => upsert(id, options),

  dismiss: (id: string) => {
    revisions.delete(id);
    dismissListener?.(id);
  },

  dismissAll: () => {
    revisions.clear();
    dismissAllListener?.();
  },

  success: (title: string, message?: string) =>
    upsert(nextId(), { type: "success", title, message }),
  error: (title: string, message?: string) =>
    upsert(nextId(), { type: "error", title, message }),
  warning: (title: string, message?: string) =>
    upsert(nextId(), { type: "warning", title, message }),
  info: (title: string, message?: string) =>
    upsert(nextId(), { type: "info", title, message }),

  /** A spinner toast that stays until you `update` or `dismiss` it. */
  loading: (title: string, message?: string) =>
    upsert(nextId(), { type: "loading", title, message }),

  /**
   * Run `work` behind a single toast that starts as a spinner and resolves to
   * success or error in place. Rethrows so callers can still branch on failure.
   *
   *   await toast.promise(upload(), {
   *     loading: "Uploading receipt…",
   *     success: (n) => ({ title: "Receipt uploaded" }),
   *     error: (e) => ({ title: "Upload failed", message: await parse(e) }),
   *   })
   */
  promise: async <T>(
    work: Promise<T>,
    copy: {
      loading: string | ToastOptions;
      success:
        | ToastOptions
        | ((result: T) => ToastOptions | Promise<ToastOptions>);
      error:
        | ToastOptions
        | ((error: unknown) => ToastOptions | Promise<ToastOptions>);
    },
  ): Promise<T> => {
    const id = upsert(
      nextId(),
      typeof copy.loading === "string"
        ? { type: "loading", title: copy.loading }
        : { ...copy.loading, type: "loading" },
    );

    try {
      const result = await work;
      const done =
        typeof copy.success === "function"
          ? await copy.success(result)
          : copy.success;
      upsert(id, { type: "success", ...done });
      return result;
    } catch (error) {
      const failed =
        typeof copy.error === "function" ? await copy.error(error) : copy.error;
      upsert(id, { type: "error", ...failed });
      throw error;
    }
  },
};

export default toast;
