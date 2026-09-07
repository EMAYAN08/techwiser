export type QrObservation = {
  data: string;
  fill: number;
  span: number;
  nx: number;
  ny: number;
  pad: number;
};

export type ScanGuide = "seek" | "closer" | "farther" | "hold" | "lock";
export type ScanKind = "qr" | "barcode";

export const LOCK_HOLD_MS = 180;
export const LOST_GRACE_MS = 260;
export const GUIDE_STICK_MS = 90;

const SWEET_FILL = 0.34;
const SWEET_SPAN = 0.62;

function finitePts(
  points: Array<{ x: number; y: number } | null | undefined>
): Array<{ x: number; y: number }> {
  return points.filter(
    (p): p is { x: number; y: number } =>
      !!p && Number.isFinite(p.x) && Number.isFinite(p.y)
  );
}

export function geometryFromCorners(
  points: Array<{ x: number; y: number } | null | undefined>,
  frameW: number,
  frameH: number,
  data: string
): QrObservation | null {
  const pts = finitePts(points);
  if (pts.length < 2 || frameW < 2 || frameH < 2 || !data) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return geometryFromBox(minX, minY, maxX - minX, maxY - minY, frameW, frameH, data);
}

export function geometryFromBox(
  x: number,
  y: number,
  width: number,
  height: number,
  frameW: number,
  frameH: number,
  data: string
): QrObservation | null {
  if (!data || frameW < 2 || frameH < 2) return null;
  let bx = x;
  let by = y;
  let bw = width;
  let bh = height;
  if (bw <= 1.5 && bh <= 1.5 && frameW > 2 && frameH > 2) {
    bx *= frameW;
    by *= frameH;
    bw *= frameW;
    bh *= frameH;
  }
  if (bw < 2 && bh < 2) return null;
  bw = Math.max(bw, 2);
  bh = Math.max(bh, 2);
  const short = Math.min(frameW, frameH);
  const fill = Math.min(bw, bh) / short;
  const span = Math.max(bw, bh) / short;
  const nx = (bx + bw / 2) / frameW;
  const ny = (by + bh / 2) / frameH;
  const pad = Math.min(bx, by, frameW - (bx + bw), frameH - (by + bh)) / short;
  return { data, fill, span, nx, ny, pad };
}

export function observationFromDataOnly(data: string): QrObservation {
  return { data, fill: SWEET_FILL, span: SWEET_SPAN, nx: 0.5, ny: 0.5, pad: 0.2 };
}

export function assessGuide(
  obs: QrObservation | null,
  kind: ScanKind = "qr"
): Exclude<ScanGuide, "lock"> {
  if (!obs) return "seek";
  const dx = Math.abs(obs.nx - 0.5);
  const dy = Math.abs(obs.ny - 0.5);

  if (kind === "barcode") {
    if (obs.span < 0.38) return "closer";
    if (obs.span > 0.94 || obs.pad < 0.02) return "farther";
    if (dy > 0.34 || dx > 0.38) return obs.span < 0.32 ? "closer" : "seek";
    return "hold";
  }

  if (obs.fill < 0.32) return "closer";
  if (obs.fill > 0.56 || obs.pad < 0.045) return "farther";
  if (dx > 0.3 || dy > 0.3) {
    return obs.fill < 0.26 ? "closer" : "seek";
  }
  return "hold";
}

export function pickBestObservation(
  list: QrObservation[],
  kind: ScanKind = "qr"
): QrObservation | null {
  if (list.length === 0) return null;
  const sweet = kind === "barcode" ? SWEET_SPAN : SWEET_FILL;
  const metric = (o: QrObservation) => (kind === "barcode" ? o.span : o.fill);
  const holds = list.filter((o) => assessGuide(o, kind) === "hold");
  const pool = holds.length ? holds : list;
  return pool.slice().sort((a, b) => Math.abs(metric(a) - sweet) - Math.abs(metric(b) - sweet))[0];
}

export function guideCopy(guide: ScanGuide, scannedCount = 0, kind: ScanKind = "qr"): string {
  switch (guide) {
    case "closer":
      return "Move closer";
    case "farther":
      return "Move a little bit away";
    case "hold":
      return "Hold steady";
    case "lock":
      return "Captured";
    default:
      if (kind === "barcode") {
        return scannedCount > 0
          ? "Point at the next product barcode."
          : "Hold the UPC or EAN in the frame.";
      }
      return scannedCount > 0
        ? "Point at the next product QR."
        : "Hold the product QR in the frame.";
  }
}
