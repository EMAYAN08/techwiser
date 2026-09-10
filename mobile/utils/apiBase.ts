export function getApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (typeof env === "string" && env.trim().length > 0) {
    return env.replace(/\/$/, "");
  }
  // Web preview: same origin, proxied to the local backend.
  if (typeof window !== "undefined") {
    return "";
  }
  return "https://techwiser.onrender.com";
}
