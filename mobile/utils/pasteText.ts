/** Payload from expo-clipboard's ClipboardPasteButton onPress (legacy / tests). */
export type PasteEventLike = {
  type?: string;
  text?: string | null;
};

/** Minimal clipboard surface so Input and tests share one reader. */
export type ClipboardReader = {
  getUrlAsync?: () => Promise<string | null | undefined>;
  getStringAsync: () => Promise<string>;
};

/** Text a URL field should accept from a paste control. Images and blanks are ignored. */
export function textFromPasteEvent(data: PasteEventLike | null | undefined): string {
  if (!data || data.type === "image") return "";
  if (typeof data.text !== "string") return "";
  return data.text.trim();
}

/**
 * Read pasteable text from the system clipboard.
 * Prefers URL entries (Safari / rich-link copies), then plain string.
 * Used by the Lucide clipboard Pressable so iOS/Android/web share one icon
 * and one paste path — not an overlay on UIPasteControl.
 */
export async function readClipboardText(clipboard: ClipboardReader): Promise<string> {
  try {
    if (typeof clipboard.getUrlAsync === "function") {
      const url = await clipboard.getUrlAsync();
      const trimmedUrl = typeof url === "string" ? url.trim() : "";
      if (trimmedUrl) return trimmedUrl;
    }
  } catch {
    // Fall through to string read.
  }

  try {
    const text = await clipboard.getStringAsync();
    return typeof text === "string" ? text.trim() : "";
  } catch {
    return "";
  }
}
