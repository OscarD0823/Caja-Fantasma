const DB_NAME = "caja-fantasma-local-vault";
const STORE_NAME = "snapshots";
const LATEST_KEY = "personal-latest";

export type WebStorageStatus = {
  supported: boolean;
  persisted: boolean;
  usage: number;
  quota: number;
};

function openVault() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open browser storage"));
  });
}

export async function loadWebPersonalBackup() {
  const database = await openVault();
  try {
    return await new Promise<string | undefined>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(LATEST_KEY);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : undefined);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function saveWebPersonalBackup(dataJson: string) {
  const database = await openVault();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(dataJson, LATEST_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function readWebStorageStatus(): Promise<WebStorageStatus> {
  if (!("storage" in navigator)) return { supported: false, persisted: false, usage: 0, quota: 0 };
  const [persisted, estimate] = await Promise.all([
    navigator.storage.persisted?.().catch(() => false) ?? Promise.resolve(false),
    navigator.storage.estimate?.().catch((): StorageEstimate => ({})) ?? Promise.resolve({} as StorageEstimate),
  ]);
  return { supported: true, persisted, usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}

export async function requestPersistentWebStorage() {
  if (!navigator.storage?.persist) return readWebStorageStatus();
  await navigator.storage.persist();
  return readWebStorageStatus();
}
