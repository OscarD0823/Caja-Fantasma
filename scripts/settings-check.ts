import assert from "node:assert/strict";
import { importState, initialState, loadState, personalSyncPayload } from "../src/storage.ts";
import type { Settings } from "../src/model.ts";

function checkRemovedSettings(settings: Settings) {
  assert.equal(Object.hasOwn(settings, "notificationsEnabled"), false);
  assert.equal(Object.hasOwn(settings, "lastNotificationPhaseStartedAt"), false);
}

checkRemovedSettings(initialState().settings);

const storageKey = "caja-fantasma.once-human.state.v1";
const backupKey = "caja-fantasma.once-human.safety-backup.v1";
const memory = new Map<string, string>();
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  },
});

try {
  for (const voiceEnabled of [true, false]) {
    const existing = initialState();
    const occurredAt = "2026-10-07T18:00:00.000Z";
    existing.actions = [{ id: "platform-claim", activityId: "gravity-platforms", activityName: "Plataformas", visionId: "gravity", visionName: "Gravedad", points: 4, occurredAt }];
    existing.activityHistory = [{ ...existing.actions[0], count: 1 }];
    existing.boxes = [{ id: "saved-box", points: 955, claims: 500, occurredAt, breakdown: [] }];
    existing.manualBaselinePoints = [704, 955];
    existing.deletedActionIds = ["removed-extra-point"];
    existing.settings.voiceNotificationsEnabled = voiceEnabled;
    existing.settings.voiceLeadMinutes = 8;
    existing.settings.lastVoiceAlertPhaseStartedAt = occurredAt;
    existing.settings.overlayEnabled = true;
    existing.settings.overlayScale = .5;
    const legacy = {
      ...existing,
      settings: { ...existing.settings, notificationsEnabled: true, lastNotificationPhaseStartedAt: occurredAt },
    };
    const text = JSON.stringify(legacy);
    memory.clear();
    memory.set(storageKey, text);

    for (const migrated of [loadState(), importState(text)]) {
      checkRemovedSettings(migrated.settings);
      assert.deepEqual(personalSyncPayload(migrated), personalSyncPayload(existing), "Removing Windows notifications must not change personal records.");
      assert.equal(migrated.settings.voiceNotificationsEnabled, voiceEnabled);
      assert.equal(migrated.settings.voiceLeadMinutes, 8);
      assert.equal(migrated.settings.lastVoiceAlertPhaseStartedAt, occurredAt);
      assert.equal(migrated.settings.overlayEnabled, true);
      assert.equal(migrated.settings.overlayScale, .5);
    }

    memory.set(storageKey, "invalid JSON");
    memory.set(backupKey, text);
    const recovered = loadState();
    checkRemovedSettings(recovered.settings);
    assert.deepEqual(personalSyncPayload(recovered), personalSyncPayload(existing));
    assert.equal(recovered.settings.voiceNotificationsEnabled, voiceEnabled);
  }
} finally {
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
}

console.log("Settings checks passed: Windows notification option removed; old backups, personal history, voice and overlay preserved.");
