import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Github, Plus, RadioTower, Save, Trash2, UploadCloud } from "lucide-react";
import type { Activity, Catalog, Vision } from "./model";
import { AUTHOR, clampNumber, createId } from "./model";

type Props = {
  catalog: Catalog;
  onSave: (catalog: Catalog) => void;
  onPublish: (catalog: Catalog) => Promise<string>;
};

export default function CatalogEditor({ catalog, onSave, onPublish }: Props) {
  const [draft, setDraft] = useState<Catalog>(() => structuredClone(catalog));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [revision, setRevision] = useState(0);
  const revisionRef = useRef(0);
  const autoAttemptedRevision = useRef(0);

  useEffect(() => {
    if (!dirty) setDraft(structuredClone(catalog));
  }, [catalog, dirty]);

  const change = (updater: (current: Catalog) => Catalog) => {
    setDraft((current) => updater(structuredClone(current)));
    setDirty(true);
    revisionRef.current += 1;
    setRevision(revisionRef.current);
    setStatus("");
  };

  const updateActivity = (group: "pro" | string, activityId: string, patch: Partial<Activity>) => change((current) => {
    if (group === "pro") current.proActivities = current.proActivities.map((activity) => activity.id === activityId ? { ...activity, ...patch } : activity);
    else current.visions = current.visions.map((vision) => vision.id === group ? { ...vision, activities: vision.activities.map((activity) => activity.id === activityId ? { ...activity, ...patch } : activity) } : vision);
    return current;
  });

  const removeActivity = (group: "pro" | string, activityId: string) => change((current) => {
    if (group === "pro") current.proActivities = current.proActivities.filter((activity) => activity.id !== activityId);
    else current.visions = current.visions.map((vision) => vision.id === group ? { ...vision, activities: vision.activities.filter((activity) => activity.id !== activityId) } : vision);
    return current;
  });

  const addActivity = (group: "pro" | string) => change((current) => {
    const activity: Activity = { id: createId("reward"), name: "Nueva recompensa", points: 1, enabled: true, note: "" };
    if (group === "pro") current.proActivities.push(activity);
    else current.visions = current.visions.map((vision) => vision.id === group ? { ...vision, activities: [...vision.activities, activity] } : vision);
    return current;
  });

  const addVision = () => change((current) => {
    const vision: Vision = { id: createId("vision"), name: "Nueva visión", englishName: "New vision", enabled: true, description: "Añade aquí la descripción del evento.", activities: [] };
    current.visions.push(vision);
    return current;
  });

  const removeVision = (visionId: string) => change((current) => ({ ...current, visions: current.visions.filter((vision) => vision.id !== visionId) }));

  const selectPublicVision = (visionId: string) => change((current) => {
    const updatedAt = new Date().toISOString();
    const timing = current.eventTiming;
    return {
      ...current,
      eventTiming: {
        selectedVisionId: visionId,
        waitMinutes: timing?.waitMinutes ?? 30,
        activeMinutes: timing?.activeMinutes ?? 30,
        transitionDelaySeconds: timing?.transitionDelaySeconds ?? 3,
        phaseStartedAt: timing?.phaseStartedAt ?? updatedAt,
        phase: timing?.phase ?? "waiting",
        updatedAt,
        updatedBy: AUTHOR,
      },
    };
  });

  const prepareVersion = useCallback(() => ({
    ...draft,
    catalogVersion: Math.max(catalog.catalogVersion + 1, draft.catalogVersion),
    updatedAt: new Date().toISOString(),
    updatedBy: AUTHOR,
    boxTargetPoints: clampNumber(draft.boxTargetPoints, 1, 10_000),
  }), [catalog.catalogVersion, draft]);

  const save = () => {
    const next = prepareVersion();
    setDraft(next);
    onSave(next);
    setDirty(false);
    setStatus(`Versión local v${next.catalogVersion} guardada.`);
  };

  const publish = useCallback(async (automatic = false) => {
    const publishingRevision = revisionRef.current;
    const next = prepareVersion();
    setPublishing(true);
    setStatus(automatic ? "Guardando y enviando automáticamente…" : "Publicando en GitHub…");
    try {
      onSave(next);
      setDraft(next);
      const message = await onPublish(next);
      if (revisionRef.current === publishingRevision) {
        setDirty(false);
        setStatus(message);
      } else {
        setStatus(`${message} Hay cambios nuevos pendientes de enviar.`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setPublishing(false);
    }
  }, [onPublish, onSave, prepareVersion]);

  useEffect(() => {
    if (!dirty || publishing || revision === autoAttemptedRevision.current) return;
    const timer = window.setTimeout(() => {
      autoAttemptedRevision.current = revision;
      void publish(true);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, publish, publishing, revision]);

  return (
    <div className="catalog-editor">
      <div className="catalog-toolbar">
        <label>Objetivo visual de la caja<input type="number" min={1} max={10000} value={draft.boxTargetPoints} onChange={(event) => change((current) => ({ ...current, boxTargetPoints: clampNumber(Number(event.target.value), 1, 10_000) }))} /></label>
        <div><span className="auto-publish-badge"><Check size={14} /> Envío automático</span><button type="button" className="secondary compact" disabled={!dirty} onClick={save}><Save size={16} /> Guardar local</button><button type="button" className="primary compact" disabled={publishing} onClick={() => void publish(false)}><UploadCloud size={16} /> {publishing ? "Publicando…" : "Publicar ahora"}</button></div>
      </div>
      {status && <div className={`catalog-status ${status.toLowerCase().includes("error") || status.toLowerCase().includes("no ") ? "error" : ""}`}><Github size={16} />{status}</div>}

      <section className="admin-vision-picker">
        <div><span className="eyebrow"><RadioTower size={15} /> CONTROL PÚBLICO</span><h3>Rueda seleccionada para todos</h3><p>Solo la cuenta propietaria puede cambiarla. Al publicarse, reemplaza la selección local de los demás equipos.</p></div>
        <div className="admin-vision-options">
          {draft.visions.map((vision) => {
            const selected = draft.eventTiming?.selectedVisionId === vision.id;
            return <button key={vision.id} type="button" disabled={!vision.enabled} className={selected ? "selected" : ""} onClick={() => selectPublicVision(vision.id)}><span>{vision.enabled ? "Disponible" : "Desactivada"}</span><strong>{vision.name}</strong>{selected && <Check size={16} />}</button>;
          })}
        </div>
      </section>

      <EditorGroup title="Recompensas Pro" subtitle={`${draft.proActivities.length} opciones`} onAdd={() => addActivity("pro")}>
        {draft.proActivities.map((activity) => <ActivityEditor key={activity.id} activity={activity} onChange={(patch) => updateActivity("pro", activity.id, patch)} onRemove={() => removeActivity("pro", activity.id)} />)}
      </EditorGroup>

      {draft.visions.map((vision) => (
        <EditorGroup key={vision.id} title={vision.name} subtitle={vision.enabled ? "Activa" : "Desactivada"} onAdd={() => addActivity(vision.id)} onRemove={draft.eventTiming?.selectedVisionId === vision.id ? undefined : () => removeVision(vision.id)}>
          <div className="vision-edit-fields">
            <label>Nombre en español<input value={vision.name} onChange={(event) => change((current) => ({ ...current, visions: current.visions.map((item) => item.id === vision.id ? { ...item, name: event.target.value } : item) }))} /></label>
            <label>Nombre en inglés<input value={vision.englishName ?? ""} onChange={(event) => change((current) => ({ ...current, visions: current.visions.map((item) => item.id === vision.id ? { ...item, englishName: event.target.value } : item) }))} /></label>
            <label>Descripción<input value={vision.description} onChange={(event) => change((current) => ({ ...current, visions: current.visions.map((item) => item.id === vision.id ? { ...item, description: event.target.value } : item) }))} /></label>
            <label className="check-field" title={draft.eventTiming?.selectedVisionId === vision.id ? "Selecciona otra rueda pública antes de desactivar esta." : undefined}><input type="checkbox" disabled={draft.eventTiming?.selectedVisionId === vision.id} checked={vision.enabled} onChange={(event) => change((current) => ({ ...current, visions: current.visions.map((item) => item.id === vision.id ? { ...item, enabled: event.target.checked } : item) }))} /> <span>{vision.enabled ? <Check size={15} /> : null}Evento habilitado</span></label>
          </div>
          {vision.activities.map((activity) => <ActivityEditor key={activity.id} activity={activity} onChange={(patch) => updateActivity(vision.id, activity.id, patch)} onRemove={() => removeActivity(vision.id, activity.id)} />)}
          {vision.activities.length === 0 && <div className="editor-empty">Sin recompensas. Usa “Añadir opción”.</div>}
        </EditorGroup>
      ))}
      <button type="button" className="add-vision" onClick={addVision}><Plus size={18} /> Añadir futura Rueda Visional</button>
    </div>
  );
}

function EditorGroup({ title, subtitle, onAdd, onRemove, children }: { title: string; subtitle: string; onAdd: () => void; onRemove?: () => void; children: React.ReactNode }) {
  return <section className="editor-group"><header><div><strong>{title}</strong><span>{subtitle}</span></div><div>{onRemove && <button type="button" className="icon-danger" onClick={onRemove} aria-label={`Eliminar ${title}`}><Trash2 size={15} /></button>}<button type="button" onClick={onAdd}><Plus size={15} /> Añadir opción</button></div></header>{children}</section>;
}

function ActivityEditor({ activity, onChange, onRemove }: { activity: Activity; onChange: (patch: Partial<Activity>) => void; onRemove: () => void }) {
  return <div className="activity-editor"><label>Nombre<input value={activity.name} onChange={(event) => onChange({ name: event.target.value })} /></label><label>Puntos<input type="number" min={0} max={1000} value={activity.points} onChange={(event) => onChange({ points: clampNumber(Number(event.target.value), 0, 1000) })} /></label><label>Nota<input value={activity.note ?? ""} onChange={(event) => onChange({ note: event.target.value })} /></label><label className="tiny-check" title="Habilitada"><input type="checkbox" checked={activity.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} /><span /></label><button type="button" className="icon-danger" onClick={onRemove} aria-label={`Eliminar ${activity.name}`}><Trash2 size={15} /></button></div>;
}
