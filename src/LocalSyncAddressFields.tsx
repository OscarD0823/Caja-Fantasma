import { useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { completeLocalSyncAddress, isValidLocalSyncAddress, joinLocalSyncAddress, splitLocalSyncAddress, type LocalSyncAddressParts } from "./localSyncAddress";

type Props = {
  value: string;
  onChange: (value: string) => void;
  language?: "es" | "en";
};

export default function LocalSyncAddressFields({ value, onChange, language = "es" }: Props) {
  const english = language === "en";
  const parts = splitLocalSyncAddress(value);
  const octetRefs = useRef<Array<HTMLInputElement | null>>([]);
  const portRef = useRef<HTMLInputElement>(null);
  const ready = isValidLocalSyncAddress(value);

  const commit = (next: LocalSyncAddressParts) => onChange(joinLocalSyncAddress(next));

  const updateOctet = (index: number, rawValue: string) => {
    const nextValue = rawValue.replace(/\D/g, "").slice(0, 3);
    const octets = [...parts.octets] as LocalSyncAddressParts["octets"];
    octets[index] = nextValue;
    commit({ ...parts, octets });
    if (nextValue.length === 3 && Number(nextValue) <= 255) {
      if (index < 3) octetRefs.current[index + 1]?.focus();
      else portRef.current?.focus();
    }
  };

  const moveBetweenOctets = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === "." || event.key === " " || event.key === "ArrowRight") && event.currentTarget.selectionStart === event.currentTarget.value.length) {
      event.preventDefault();
      if (index < 3) octetRefs.current[index + 1]?.focus();
      else portRef.current?.focus();
    }
    if (event.key === "Backspace" && !event.currentTarget.value && index > 0) {
      octetRefs.current[index - 1]?.focus();
    }
  };

  const pasteCompleteAddress = (event: ClipboardEvent<HTMLElement>) => {
    const pasted = completeLocalSyncAddress(event.clipboardData.getData("text"));
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted.address);
    portRef.current?.focus();
  };

  return <div className={`local-address-editor ${ready ? "ready" : "incomplete"}`} onPaste={pasteCompleteAddress}>
    <div className="local-address-heading"><span>{english ? "PC IP" : "IP DEL PC"}</span><small>{ready ? (english ? "Complete address" : "Dirección completa") : (english ? "Fill in all four blocks" : "Completa los cuatro bloques")}</small></div>
    <div className="local-address-row">
      <div className="local-ip-octets" aria-label={english ? "PC IP address" : "Dirección IP del PC"}>
        {parts.octets.map((octet, index) => <span className="local-ip-part" key={index}>
          <input
            ref={(node) => { octetRefs.current[index] = node; }}
            aria-label={english ? `IP address block ${index + 1}` : `Bloque ${index + 1} de la dirección IP`}
            aria-invalid={Boolean(octet) && Number(octet) > 255}
            autoComplete="off"
            enterKeyHint={index < 3 ? "next" : "done"}
            inputMode="numeric"
            maxLength={3}
            placeholder={String([192, 168, 1, 20][index])}
            value={octet}
            onChange={(event) => updateOctet(index, event.target.value)}
            onKeyDown={(event) => moveBetweenOctets(index, event)}
          />
          {index < 3 && <b aria-hidden="true">.</b>}
        </span>)}
      </div>
      <span className="local-address-colon" aria-hidden="true">:</span>
      <label className="local-port-field"><span>{english ? "PORT" : "PUERTO"}</span><input ref={portRef} aria-label={english ? "PC port" : "Puerto del PC"} aria-invalid={Number(parts.port) < 1 || Number(parts.port) > 65_535} autoComplete="off" enterKeyHint="done" inputMode="numeric" maxLength={5} placeholder="47183" value={parts.port} onChange={(event) => commit({ ...parts, port: event.target.value.replace(/\D/g, "").slice(0, 5) })} /></label>
    </div>
    <small className="local-address-tip">{english ? "You can also paste the full PC address into any block." : "También puedes pegar la dirección completa del PC en cualquiera de los bloques."}</small>
  </div>;
}
