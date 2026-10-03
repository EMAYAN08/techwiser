/** Payload from expo-clipboard's ClipboardPasteButton onPress. */
export type PasteEventLike = {
  type?: string;
  text?: string | null;
};

/** Text a URL field should accept from a paste control. Images and blanks are ignored. */
export function textFromPasteEvent(data: PasteEventLike | null | undefined): string {
  if (!data || data.type === "image") return "";
  if (typeof data.text !== "string") return "";
  return data.text.trim();
}
