export const ICON_KEYS = [
  "cpu",
  "battery",
  "display",
  "camera",
  "wifi",
  "speaker",
  "ports",
  "design",
  "software",
  "health",
  "storage",
  "memory",
  "graphics",
  "keyboard",
  "smart",
  "audio",
  "other",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

/**
 * Preferred filter-pill group names by device type.
 * Guideline only — the model may add extra groups when a spec does not fit.
 */
export const PREFERRED_SPEC_GROUPS: Record<string, string[]> = {
  smartphone: ["Performance", "Display", "Camera", "Battery", "Design", "Connectivity", "Software"],
  tablet: ["Performance", "Display", "Battery", "Camera", "Design", "Connectivity", "Software"],
  laptop: [
    "Performance",
    "Memory",
    "Storage",
    "Display",
    "Graphics",
    "Battery",
    "Ports",
    "Keyboard",
    "Design",
    "Software",
  ],
  desktop: ["Performance", "Memory", "Storage", "Graphics", "Ports", "Cooling", "Design"],
  television: ["Display", "Picture", "Sound", "Smart Features", "Ports", "Design"],
  monitor: ["Display", "Picture", "Ports", "Ergonomics", "Design"],
  headphones: ["Sound", "Noise Cancellation", "Battery", "Connectivity", "Design"],
  earbuds: ["Sound", "Noise Cancellation", "Battery", "Connectivity", "Design"],
  speakers: ["Sound", "Connectivity", "Power", "Design"],
  soundbar: ["Sound", "Connectivity", "Smart Features", "Design"],
  smartwatch: ["Health", "Display", "Battery", "Design", "Software"],
  camera: ["Sensor", "Video", "Lens", "Battery", "Connectivity"],
  console: ["Performance", "Storage", "Graphics", "Controllers", "Software"],
  router: ["Performance", "Connectivity", "Coverage", "Ports", "Software"],
  appliance: ["Capacity", "Performance", "Energy", "Smart Features", "Design"],
  streaming: ["Video", "Audio", "Connectivity", "Software", "Design"],
  other: ["Performance", "Design", "Connectivity", "Power", "Other Features"],
};

export function preferredGroupsJson(): string {
  return JSON.stringify(PREFERRED_SPEC_GROUPS, null, 2);
}
