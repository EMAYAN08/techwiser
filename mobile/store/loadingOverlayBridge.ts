type Handler = () => void;

const handlers: { onCancel?: Handler; onCelebrateEnd?: Handler } = {};

export function registerLoadingOverlayHandlers(next: {
  onCancel?: Handler;
  onCelebrateEnd?: Handler;
}) {
  handlers.onCancel = next.onCancel;
  handlers.onCelebrateEnd = next.onCelebrateEnd;
}

export function runLoadingOverlayCancel() {
  handlers.onCancel?.();
}

export function runLoadingOverlayCelebrateEnd() {
  handlers.onCelebrateEnd?.();
}
