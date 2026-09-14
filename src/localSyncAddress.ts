export const DEFAULT_LOCAL_SYNC_PORT = "47183";

export type LocalSyncAddressParts = {
  octets: [string, string, string, string];
  port: string;
};

function cleanAddress(value: string) {
  return value.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function splitLocalSyncAddress(value: string): LocalSyncAddressParts {
  const cleaned = cleanAddress(value);
  const separator = cleaned.lastIndexOf(":");
  const host = separator >= 0 ? cleaned.slice(0, separator) : cleaned;
  const suppliedPort = separator >= 0 ? cleaned.slice(separator + 1) : "";
  const sourceOctets = host.split(".");
  const octets = Array.from({ length: 4 }, (_, index) => (sourceOctets[index] ?? "").replace(/\D/g, "").slice(0, 3)) as LocalSyncAddressParts["octets"];
  return {
    octets,
    port: suppliedPort.replace(/\D/g, "").slice(0, 5) || DEFAULT_LOCAL_SYNC_PORT,
  };
}

export function joinLocalSyncAddress(parts: LocalSyncAddressParts) {
  if (parts.octets.every((part) => !part)) return "";
  return `${parts.octets.join(".")}:${parts.port || DEFAULT_LOCAL_SYNC_PORT}`;
}

export function isValidLocalSyncAddress(value: string) {
  const cleaned = cleanAddress(value);
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::(\d{1,5}))?$/.exec(cleaned);
  if (!match) return false;
  const octets = match.slice(1, 5).map(Number);
  const port = Number(match[5] || DEFAULT_LOCAL_SYNC_PORT);
  return octets.every((part) => part >= 0 && part <= 255) && port >= 1 && port <= 65_535;
}

export function completeLocalSyncAddress(value: string) {
  if (!isValidLocalSyncAddress(value)) return undefined;
  const parts = splitLocalSyncAddress(value);
  return { ...parts, address: joinLocalSyncAddress(parts) };
}
