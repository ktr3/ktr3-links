"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./Admin.module.css";

const EMPTY_FORM = {
  title: "",
  summary: "",
  description: "",
  category: "serum",
  accessModel: "email",
  tags: "",
};

const STATUS_LABEL = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function ResourceForm({ editing, onSaved, onCancel }) {
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const values = editing ? {
    title: editing.title,
    summary: editing.summary,
    description: editing.description,
    category: editing.category,
    accessModel: editing.accessModel,
    tags: (editing.tags || []).join(", "),
  } : EMPTY_FORM;
  const [category, setCategory] = useState(values.category);
  const [accessModel, setAccessModel] = useState(
    values.category === "midi" ? "email" : values.accessModel,
  );

  useEffect(() => {
    setCategory(values.category);
    setAccessModel(values.category === "midi" ? "email" : values.accessModel);
  }, [editing?.id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setState("submitting");
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(
        editing ? `/api/admin/resources/${editing.id}` : "/api/admin/resources",
        { method: editing ? "PUT" : "POST", body: form },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el recurso");
      setState("saved");
      setMessage(editing ? "Recurso actualizado." : "Recurso creado como borrador.");
      event.currentTarget.reset();
      onSaved(payload.resource);
    } catch (error) {
      setState("error");
      setMessage(error.message);
    }
  }

  return (
    <section className={styles.editor} aria-labelledby="resource-editor-title">
      <div className={styles.sectionTitle}>
        <div>
          <span>{editing ? "EDIT_RESOURCE" : "NEW_RESOURCE"}</span>
          <h2 id="resource-editor-title">{editing ? `Editar ${editing.title}` : "Subir un recurso"}</h2>
        </div>
        {editing && <button type="button" className={styles.ghostButton} onClick={onCancel}>Cancelar edición</button>}
      </div>

      <form key={editing?.id || "new"} onSubmit={handleSubmit} className={styles.resourceForm}>
        <div className={styles.fieldWide}>
          <label htmlFor="resource-title">Título *</label>
          <input id="resource-title" name="title" defaultValue={values.title} minLength="3" maxLength="100" required />
        </div>
        <div className={styles.fieldWide}>
          <label htmlFor="resource-summary">Resumen *</label>
          <input id="resource-summary" name="summary" defaultValue={values.summary} minLength="10" maxLength="180" required />
          <small>Una frase clara para la tarjeta pública.</small>
        </div>
        <div>
          <label htmlFor="resource-category">Categoría *</label>
          <select
            id="resource-category"
            name="category"
            value={category}
            onChange={(event) => {
              const nextCategory = event.target.value;
              setCategory(nextCategory);
              if (nextCategory === "midi") setAccessModel("email");
            }}
            required
          >
            <option value="serum">Serum</option>
            <option value="midi">MIDI</option>
            <option value="fx">FX</option>
            <option value="template">Plantillas</option>
            <option value="samples">Samples</option>
            <option value="oneshot">One-shots</option>
            <option value="other">Otros</option>
          </select>
        </div>
        <div>
          <label htmlFor="resource-access">Acceso *</label>
          <select
            id="resource-access"
            name="accessModel"
            value={accessModel}
            onChange={(event) => setAccessModel(event.target.value)}
            required
          >
            <option value="email">Entrega por email</option>
            {category !== "midi" && <option value="open">Descarga directa</option>}
          </select>
          {category === "midi" && <small>Los MIDI siempre se entregan mediante un enlace privado por email.</small>}
        </div>
        <div className={styles.fieldWide}>
          <label htmlFor="resource-tags">Tags</label>
          <input id="resource-tags" name="tags" defaultValue={values.tags} placeholder="trap, 808, dark" />
          <small>Hasta 12, separados por comas.</small>
        </div>
        <div className={styles.fieldWide}>
          <label htmlFor="resource-description">Descripción *</label>
          <textarea id="resource-description" name="description" defaultValue={values.description} minLength="10" maxLength="5000" rows="5" required />
        </div>
        <div className={styles.fileField}>
          <label htmlFor="resource-download">
            Archivo descargable {!editing && "*"}
            <span>.fxp, .SerumPreset, .mid, .zip, .flp o .wav · máximo 250 MB</span>
          </label>
          <input
            id="resource-download"
            name="download"
            type="file"
            accept=".fxp,.SerumPreset,.mid,.midi,.zip,.flp,.wav"
            required={!editing}
          />
          {editing?.fileName && <small>Actual: {editing.fileName} · {formatBytes(editing.fileSize)}</small>}
        </div>
        <div className={styles.fileField}>
          <label htmlFor="resource-cover">
            Portada
            <span>PNG, JPG o WebP · máximo 8 MB</span>
          </label>
          <input id="resource-cover" name="cover" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" />
          {editing?.hasCover && <small>El recurso ya tiene portada.</small>}
        </div>
        <div className={styles.fileField}>
          <label htmlFor="resource-preview">
            {category === "midi" ? "Preview de audio (opcional)" : "Preview de audio"}
            <span>
              {category === "midi"
                ? "Se genera automáticamente en chiptune 8-bit · puedes sustituirla con MP3, WAV, OGG o M4A"
                : "MP3, WAV, OGG o M4A · máximo 30 MB"}
            </span>
          </label>
          <input id="resource-preview" name="preview" type="file" accept=".mp3,.wav,.ogg,.m4a,audio/*" />
          {editing?.hasPreview && <small>El recurso ya tiene preview.</small>}
        </div>
        <div className={styles.formActions}>
          <button className={styles.primaryButton} type="submit" disabled={state === "submitting"}>
            {state === "submitting" ? "Subiendo archivos…" : editing ? "Guardar cambios" : "Crear borrador"}
          </button>
          <p className={state === "error" ? styles.errorMessage : styles.successMessage} aria-live="polite">
            {message}
          </p>
        </div>
      </form>
    </section>
  );
}

function SubscriberTable({ subscribers }) {
  function exportCsv() {
    const columns = [
      ["email", "email"],
      ["name", "name"],
      ["status", "status"],
      ["marketing_consent", "marketingConsent"],
      ["consent_at", "consentAt"],
      ["created_at", "createdAt"],
    ];
    const rows = subscribers.map((subscriber) => columns.map(([, key]) => (
      `"${String(subscriber[key] ?? "").replaceAll('"', '""')}"`
    )).join(","));
    const blob = new Blob([[columns.map(([label]) => label).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ktr3-subscriptores-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <section className={styles.tablePanel}>
      <div className={styles.sectionTitle}>
        <div><span>COMMUNITY_DB</span><h2>Suscriptores recientes</h2></div>
        <button type="button" className={styles.ghostButton} onClick={exportCsv} disabled={!subscribers.length}>Exportar CSV</button>
      </div>
      <div className={styles.tableScroll}>
        <table>
          <thead><tr><th>Email</th><th>Nombre</th><th>Estado</th><th>Tips</th><th>Alta</th></tr></thead>
          <tbody>
            {subscribers.length === 0 ? (
              <tr><td colSpan="5" className={styles.tableEmpty}>Todavía no hay contactos.</td></tr>
            ) : subscribers.map((subscriber) => (
              <tr key={subscriber.id}>
                <td>{subscriber.email}</td>
                <td>{subscriber.name || "—"}</td>
                <td><span className={`${styles.status} ${styles[`status_${subscriber.status}`]}`}>{subscriber.status}</span></td>
                <td>{subscriber.marketingConsent ? "Sí" : "No"}</td>
                <td>{formatDate(subscriber.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminDashboard({ admin }) {
  const [data, setData] = useState({ resources: [], subscribers: [], summary: {} });
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/resources", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar el panel");
      setData(payload);
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(error.message);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const conversion = useMemo(() => {
    const deliveries = Number(data.summary.gatedDeliveries) || 0;
    const confirmed = Number(data.summary.confirmedSubscribers) || 0;
    return deliveries ? `${Math.round((confirmed / deliveries) * 100)}%` : "0%";
  }, [data.summary]);

  async function updateStatus(resource, status) {
    if (status === "archived" && !window.confirm(`¿Archivar "${resource.title}"? Dejará de aparecer públicamente.`)) return;
    setMessage("");
    try {
      const response = await fetch(`/api/admin/resources/${resource.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo cambiar el estado");
      await refresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <main className={styles.adminPage}>
      <header className={styles.adminHeader}>
        <a href="/" className={styles.adminBrand}><img src="/logo.png" alt="" /><span>KTR3 CONTROL</span></a>
        <div className={styles.adminIdentity}>
          <span><i /> {admin.displayName}</span>
          <a href="/recursos" target="_blank">Ver biblioteca ↗</a>
          <button type="button" onClick={logout}>Salir</button>
        </div>
      </header>

      <div className={styles.adminShell}>
        <section className={styles.welcome}>
          <div><p>RESOURCE MANAGER://ONLINE</p><h1>Tu biblioteca,<br />bajo control.</h1></div>
          <p>Sube, organiza y publica recursos sin tocar código ni entrar al servidor.</p>
        </section>

        {message && <div className={styles.globalError} role="alert">{message}</div>}

        <section className={styles.stats} aria-label="Resumen">
          <article><span>Publicados</span><b>{data.summary.publishedResources ?? "—"}</b><small>recursos visibles</small></article>
          <article><span>Descargas</span><b>{data.summary.totalDownloads ?? "—"}</b><small>totales</small></article>
          <article><span>Entregas email</span><b>{data.summary.gatedDeliveries ?? "—"}</b><small>enlaces generados</small></article>
          <article><span>Comunidad</span><b>{data.summary.confirmedSubscribers ?? "—"}</b><small>confirmados · {conversion}</small></article>
        </section>

        <ResourceForm
          editing={editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await refresh(); }}
        />

        <section className={styles.resourceList}>
          <div className={styles.sectionTitle}>
            <div><span>CATALOG_INDEX</span><h2>Recursos</h2></div>
            <b>{data.resources.length}</b>
          </div>
          {state === "loading" ? (
            <div className={styles.loading}>Cargando catálogo_</div>
          ) : state === "error" ? (
            <div className={styles.loading}>ERROR: {message}</div>
          ) : data.resources.length === 0 ? (
            <div className={styles.loading}>Crea tu primer recurso con el formulario superior.</div>
          ) : (
            <div className={styles.resourceRows}>
              {data.resources.map((resource) => (
                <article key={resource.id} className={styles.resourceRow}>
                  <div className={styles.resourceGlyph} aria-hidden="true">
                    {resource.category.slice(0, 2).toUpperCase()}
                  </div>
                  <div className={styles.resourceInfo}>
                    <div>
                      <h3>{resource.title}</h3>
                      <span className={`${styles.status} ${styles[`status_${resource.status}`]}`}>{STATUS_LABEL[resource.status]}</span>
                    </div>
                    <p>{resource.category} · {resource.fileName || "sin archivo"} · {formatBytes(resource.fileSize)} · {resource.downloadCount} descargas</p>
                  </div>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => { setEditing(resource); window.scrollTo({ top: 420, behavior: "smooth" }); }}>Editar</button>
                    {resource.status === "published" ? (
                      <button type="button" onClick={() => updateStatus(resource, "draft")}>Retirar</button>
                    ) : resource.status === "draft" ? (
                      <button type="button" className={styles.publishButton} onClick={() => updateStatus(resource, "published")}>Publicar</button>
                    ) : null}
                    {resource.status !== "archived" && (
                      <button type="button" className={styles.dangerButton} onClick={() => updateStatus(resource, "archived")}>Archivar</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <SubscriberTable subscribers={data.subscribers} />
      </div>
    </main>
  );
}
