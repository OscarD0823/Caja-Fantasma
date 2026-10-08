export type DeviceKind = "pc" | "web" | "mobile";

const DEVICE_KINDS = new Set<string>(["pc", "web", "mobile"]);
const PRESENCE_LIFETIME_MS = 30_000;

// Read the wall clock on reception renders too. The countdown's last timer tick
// can be older than a freshly received heartbeat and falsely mark it offline.
export function recentConnectedDevices(enabled: boolean, devices: string[], receivedAt: number, now = Date.now()): DeviceKind[] {
  const age = now - receivedAt;
  if (!enabled || receivedAt <= 0 || !Number.isFinite(age) || age < 0 || age >= PRESENCE_LIFETIME_MS) return [];
  return [...new Set(devices)].filter((id): id is DeviceKind => DEVICE_KINDS.has(id));
}
