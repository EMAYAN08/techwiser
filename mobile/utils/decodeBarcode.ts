import { Platform } from "react-native";
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import { geometryFromBox, geometryFromCorners, observationFromDataOnly, type QrObservation } from "./qrGuide";

const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
];

export const WEB_BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "itf", "code_39"] as const;

export const NATIVE_BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "itf14"] as const;

type DetectorHit = {
  rawValue?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  cornerPoints?: Array<{ x: number; y: number }>;
};

type DetectorCtor = new (o: { formats: string[] }) => {
  detect: (src: CanvasImageSource) => Promise<DetectorHit[]>;
};

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = src;
  });
}

function downscale(imageData: ImageData, max = 1000): ImageData {
  const { width, height } = imageData;
  const scale = Math.min(1, max / Math.max(width, height));
  if (scale === 1 || typeof document === "undefined") return imageData;
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const src = document.createElement("canvas");
  src.width = width;
  src.height = height;
  src.getContext("2d")!.putImageData(imageData, 0, 0);
  const dst = document.createElement("canvas");
  dst.width = w;
  dst.height = h;
  const ctx = dst.getContext("2d")!;
  ctx.drawImage(src, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function zxingFromImageData(imageData: ImageData, tryHarder = true): QrObservation | null {
  try {
    const { data, width, height } = imageData;
    const luminances = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      luminances[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    }
    const source = new RGBLuminanceSource(luminances as unknown as Uint8ClampedArray, width, height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    const reader = new MultiFormatReader();
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
    if (tryHarder) hints.set(DecodeHintType.TRY_HARDER, true);
    reader.setHints(hints);
    const result = reader.decode(bitmap, hints);
    const text = result?.getText();
    if (!text) return null;
    const pts = (result.getResultPoints() || []).filter(Boolean).map((p) => ({ x: p.getX(), y: p.getY() }));
    return geometryFromCorners(pts, width, height, text) || observationFromDataOnly(text);
  } catch {
    return null;
  }
}

export async function detectBarcodesFromCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  detector: InstanceType<DetectorCtor> | null
): Promise<QrObservation[]> {
  const mapped: QrObservation[] = [];
  if (detector) {
    try {
      const codes = await detector.detect(source);
      for (const code of codes || []) {
        if (!code.rawValue) continue;
        const pts = code.cornerPoints;
        const box = code.boundingBox;
        const geo =
          (pts && geometryFromCorners(pts, width, height, code.rawValue)) ||
          (box && geometryFromBox(box.x, box.y, box.width, box.height, width, height, code.rawValue)) ||
          observationFromDataOnly(code.rawValue);
        if (geo) mapped.push(geo);
      }
    } catch {
      /* detector frame skipped */
    }
  }
  return mapped;
}

export function makeWebBarcodeDetector(): InstanceType<DetectorCtor> | null {
  if (typeof window === "undefined") return null;
  const Detector = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (typeof Detector !== "function") return null;
  try {
    return new Detector({ formats: [...WEB_BARCODE_FORMATS] });
  } catch {
    try {
      return new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    } catch {
      return null;
    }
  }
}

export function decodeBarcodeFromImageData(imageData: ImageData, tryHarder = false): QrObservation | null {
  return zxingFromImageData(imageData, tryHarder);
}

export async function decodeBarcodeFromImageUri(uri: string): Promise<string | null> {
  if (!uri) return null;
  if (Platform.OS !== "web") {
    try {
      const { scanFromURLAsync } = await import("expo-camera");
      const results = await scanFromURLAsync(uri, [...NATIVE_BARCODE_TYPES]);
      if (results?.[0]?.data) return results[0].data;
    } catch {
      /* fall through */
    }
  }
  if (typeof document === "undefined") return null;
  try {
    const img = await loadHtmlImage(uri);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    if (!canvas.width || !canvas.height) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const detector = makeWebBarcodeDetector();
    if (detector) {
      const hits = await detectBarcodesFromCanvas(canvas, canvas.width, canvas.height, detector);
      if (hits[0]?.data) return hits[0].data;
    }
    const imageData = downscale(ctx.getImageData(0, 0, canvas.width, canvas.height));
    return zxingFromImageData(imageData, true)?.data ?? null;
  } catch {
    return null;
  }
}
