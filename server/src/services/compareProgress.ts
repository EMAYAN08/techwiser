export type CompareProgress = {
  stage: string;
  message: string;
  updatedAt: string;
};

const store = new Map<string, CompareProgress>();
const TTL_MS = 10 * 60 * 1000;

export function sanitizeCompareId(raw: unknown): string | null {
  const id = String(raw || "").trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
  return id;
}

function sweep(now = Date.now()) {
  for (const [id, value] of store) {
    const ts = Date.parse(value.updatedAt);
    if (!Number.isFinite(ts) || now - ts > TTL_MS) store.delete(id);
  }
}

export function setCompareProgress(id: string | null, stage: string, message: string): void {
  sweep();
  if (!id) return;
  store.set(id, { stage, message, updatedAt: new Date().toISOString() });
}

export function getCompareProgress(id: string | null): CompareProgress {
  sweep();
  if (!id) return { stage: "idle", message: "Waiting to start", updatedAt: new Date().toISOString() };
  return store.get(id) || { stage: "idle", message: "Waiting to start", updatedAt: new Date().toISOString() };
}
