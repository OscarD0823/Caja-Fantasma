/** A phone browser/PWA is still the web; only the native runtime can host a bridge. */
export function runtimePlatform(native: boolean, userAgent: string): "web" | "android" | "windows" {
  return !native ? "web" : /Android/i.test(userAgent) ? "android" : "windows";
}
