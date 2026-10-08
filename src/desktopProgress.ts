import type { PersistedState } from "./model.ts";
import { mergePersonalSyncPayload, personalSyncPayload, saveState } from "./storage.ts";

type Invoke = <T>(command: string, args: Record<string, unknown>) => Promise<T>;

/** Save local preferences as well as the latest shared progress before allowing exit. */
export async function persistDesktopProgress(state: PersistedState, invoke: Invoke, exitApp: boolean, persist = saveState) {
  persist(state);
  const dataJson = await invoke<string>("flush_desktop_progress", {
    dataJson: JSON.stringify(personalSyncPayload(state)), exitApp,
  });
  const merged = mergePersonalSyncPayload(state, JSON.parse(dataJson) as unknown, true);
  persist(merged);
  return merged;
}
