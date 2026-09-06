import { Platform } from "react-native";
import jsQR from "jsqr";

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = src;
  });
}

function downscale(imageData: ImageData, max = 900): ImageData {
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

async function decodeOnWeb(uri: string): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const img = await loadHtmlImage(uri);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  if (!canvas.width || !canvas.height) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const imageData = downscale(ctx.getImageData(0, 0, canvas.width, canvas.height));

  const Detector = (globalThis as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
  if (typeof Detector === "function") {
    try {
      const detector = new Detector({ formats: ["qr_code"] });
      const codes = await detector.detect(canvas);
      if (codes?.[0]?.rawValue) return codes[0].rawValue;
    } catch {
      /* fall through to jsQR */
    }
  }

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  return code?.data ?? null;
}

export async function decodeQrFromImageUri(uri: string): Promise<string | null> {
  if (!uri) return null;
  if (Platform.OS === "web") {
    try {
      return await decodeOnWeb(uri);
    } catch {
      return null;
    }
  }
  try {
    const { scanFromURLAsync } = await import("expo-camera");
    const results = await scanFromURLAsync(uri, ["qr"]);
    return results?.[0]?.data ?? null;
  } catch {
    if (uri.startsWith("data:") || uri.startsWith("blob:") || uri.startsWith("http")) {
      try {
        return await decodeOnWeb(uri);
      } catch {
        return null;
      }
    }
    return null;
  }
}
