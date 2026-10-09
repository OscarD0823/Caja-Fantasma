import { useCallback, useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { recentConnectedDevices } from "./devicePresence";
import { exchangeWithPhone, type PhoneBridgeInfo, type PhoneBridgeSnapshot } from "./phoneBridgeProtocol";
import { createPhoneBridgeLifecycle } from "./phoneBridgeLifecycle";

const hostLifecycle = createPhoneBridgeLifecycle();

export function usePhoneBridgeSync({ ready, mobile, web, code, address, dataJson, catalogJson, english, getSnapshot, onSnapshot, onCatalog }: {
  ready: boolean; mobile: boolean; web: boolean; code: string; address: string; dataJson: string; catalogJson: string; english: boolean;
  getSnapshot: () => Pick<PhoneBridgeSnapshot, "dataJson" | "updatedAt">;
  onSnapshot: (snapshot: PhoneBridgeSnapshot) => void; onCatalog: (catalogJson?: string) => void;
}) {
  // Sharing is deliberately opt-in on every launch. It never starts a listener
  // simply because a backup/configuration was imported from another device.
  const [enabled, setEnabled] = useState(false);
  const [live, setLive] = useState(true);
  const [info, setInfo] = useState<PhoneBridgeInfo>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [presence, setPresence] = useState({ devices: [] as string[], at: 0 });
  const revision = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const session = useRef(0);
  const props = useRef({ getSnapshot, onSnapshot, onCatalog, dataJson, catalogJson });
  props.current = { getSnapshot, onSnapshot, onCatalog, dataJson, catalogJson };

  const exchange = useCallback(async (manual = false) => {
    if (!ready || !web || !enabled || inFlight.current) return;
    const token = session.current;
    const request = new AbortController();
    inFlight.current = request;
    if (manual) setBusy(true);
    try {
      const result = await exchangeWithPhone(address, code, manual ? "push" : "live", props.current.getSnapshot(), revision.current, english, request.signal);
      if (token !== session.current) return;
      revision.current = result.revision;
      props.current.onSnapshot(result);
      props.current.onCatalog(result.catalogJson);
      setPresence({ devices: result.connectedDevices ?? ["web", "mobile"], at: Date.now() });
      setMessage(english ? "Phone connected · data up to date" : "Celular conectado · datos al día");
    } catch (error) {
      if (token === session.current) { setPresence({ devices: [], at: 0 }); setMessage(String(error instanceof Error ? error.message : error)); }
    } finally { if (inFlight.current === request) inFlight.current = null; if (token === session.current) setBusy(false); }
  }, [address, code, enabled, english, ready, web]);

  useEffect(() => {
    if (!mobile || !isTauri()) return;
    const token = ++session.current;
    revision.current = 0;
    setInfo(undefined);
    setMessage("");
    setPresence({ devices: [], at: 0 });
    if (!enabled || !ready) { setBusy(false); void hostLifecycle.run(() => invoke("stop_local_sync")).catch(() => undefined); return; }
    let active = true;
    let listening = false;
    let polling = false;
    setBusy(true);
    const read = async () => {
      if (!active || !listening || polling) return;
      polling = true;
      try {
        const result = await invoke<PhoneBridgeSnapshot>("read_local_sync_state");
        if (!active) return;
        revision.current = result.revision;
        if (result.dataJson !== props.current.getSnapshot().dataJson) props.current.onSnapshot(result);
        setPresence({ devices: result.connectedDevices ?? [], at: Date.now() });
      } catch (error) { if (active) setMessage(String(error)); }
      finally { polling = false; }
    };
    void hostLifecycle.run(() => active ? invoke<PhoneBridgeInfo>("start_local_sync", { pairingCode: code, ...props.current.getSnapshot(), catalogJson: props.current.catalogJson, liveEnabled: live }) : Promise.resolve(undefined)).then(result => {
      if (!result || !active || session.current !== token) return;
      listening = true;
      revision.current = result.revision;
      setInfo(result);
      setMessage(english ? "Ready to connect the website" : "Listo para conectar la página");
      void read();
    }).catch(error => { if (active) setMessage(String(error)); }).finally(() => { if (active) setBusy(false); });
    const timer = window.setInterval(() => void read(), 1_500);
    const resume = () => void read();
    window.addEventListener("focus", resume);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", resume); void hostLifecycle.run(() => invoke("stop_local_sync")).catch(() => undefined); };
  }, [code, enabled, english, live, mobile, ready]);

  useEffect(() => {
    if (!mobile || !enabled || !ready || !info) return;
    let active = true;
    void invoke<number>("update_local_sync_state", { ...getSnapshot(), catalogJson, liveEnabled: live, knownRevision: revision.current }).then(next => { if (active) revision.current = Math.max(revision.current, next); }).catch(error => { if (active) setMessage(String(error)); });
    return () => { active = false; };
  }, [catalogJson, dataJson, enabled, getSnapshot, info, live, mobile, ready]);

  useEffect(() => {
    if (!web) return;
    ++session.current; revision.current = 0;
    inFlight.current?.abort(); inFlight.current = null;
    setMessage("");
    setPresence({ devices: [], at: 0 });
    setBusy(false);
    if (!ready || !enabled) return;
    void exchange(true);
    const timer = live ? window.setInterval(() => void exchange(), 2_000) : undefined;
    const resume = () => void exchange();
    if (live) window.addEventListener("focus", resume);
    return () => { clearInterval(timer); window.removeEventListener("focus", resume); inFlight.current?.abort(); inFlight.current = null; };
  }, [enabled, exchange, live, ready, web]);

  useEffect(() => () => { ++session.current; }, []);
  const online = recentConnectedDevices(enabled, presence.devices, presence.at);
  return { enabled, setEnabled, live, setLive, info, message, busy, online, send: () => exchange(true) };
}
