import { reactive, readonly } from 'vue';
import type { DeepReadonly } from 'vue';

// Shared, module-level state so every caller and the single <ConfirmDialog>
// host talk to the same dialog. `confirm()` returns a Promise<boolean> that
// resolves true on accept and false on cancel.

export interface ConfirmState {
  open: boolean;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
}

const state = reactive<ConfirmState>({
  open: false,
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
});

let resolver: ((result: boolean) => void) | null = null;

/**
 * Ask the user to confirm an action.
 * Resolves true if confirmed, false if cancelled.
 */
function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  // If a previous prompt is somehow still open, cancel it before reusing state.
  if (resolver) settle(false);
  state.message = message;
  state.confirmLabel = options.confirmLabel ?? 'Confirm';
  state.cancelLabel = options.cancelLabel ?? 'Cancel';
  state.open = true;
  return new Promise((resolve) => {
    resolver = resolve;
  });
}

function settle(result: boolean): void {
  state.open = false;
  if (resolver) {
    const resolve = resolver;
    resolver = null;
    resolve(result);
  }
}

export function useConfirm(): {
  state: DeepReadonly<ConfirmState>;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  accept: () => void;
  cancel: () => void;
} {
  return {
    state: readonly(state),
    confirm,
    accept: () => settle(true),
    cancel: () => settle(false),
  };
}
