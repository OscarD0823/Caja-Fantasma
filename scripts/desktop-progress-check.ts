import assert from "node:assert/strict";
import { persistDesktopProgress } from "../src/desktopProgress.ts";
import { initialState, personalSyncPayload } from "../src/storage.ts";
import type { PersistedState } from "../src/model.ts";

const state = initialState();
state.settings.overlayScale = .55;
state.actions = [{ id: "last-click", activityId: "platform", activityName: "Plataformas", points: 4, source: "vision", createdAt: "2026-10-07T18:00:00Z" }] as PersistedState["actions"];
const saves: PersistedState[] = [];
const calls: string[] = [];
const saved = await persistDesktopProgress(state, async <T>(command: string, args: Record<string, unknown>) => {
  calls.push(command);
  assert.equal(saves.length, 1, "Preferences and last click must be saved before invoking the backend.");
  assert.equal(args.exitApp, true);
  const data = JSON.parse(args.dataJson as string);
  data.actions.push({ ...state.actions[0], id: "phone-inbound", points: 1 });
  return JSON.stringify(data) as T;
}, true, value => saves.push(value));
assert.equal(saved.actions.reduce((sum, item) => sum + item.points, 0), 5);
assert.equal(saved.settings.overlayScale, .55);
assert.equal(saves.length, 2);
assert.deepEqual(calls, ["flush_desktop_progress"]);
await assert.rejects(persistDesktopProgress(state, async () => { throw new Error("disk full"); }, true, () => undefined), /disk full/);
await assert.rejects(persistDesktopProgress(state, async <T>() => JSON.stringify(personalSyncPayload(state)) as T, false, () => { throw new Error("storage unavailable"); }), /storage unavailable/);
console.log("Desktop safe-save checks passed: last click, inbound data, preferences, failure protection.");
