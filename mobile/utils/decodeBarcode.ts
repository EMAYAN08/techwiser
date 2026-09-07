import { Platform } from "react-native";
import { type QrObservation } from "./qrGuide";

export const WEB_BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "itf", "code_39"] as const;

export const NATIVE_BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "itf14"] as const;

export async function detectBarcodesFromCanvas(
  source: any,
  width: number,
  height: number,
  detector: any
): Promise<QrObservation[]> {
  return [];
}

export function makeWebBarcodeDetector(): any {
  return null;
}

export function decodeBarcodeFromImageData(imageData: any, tryHarder = false): QrObservation | null {
  return null;
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
  return null;
}
