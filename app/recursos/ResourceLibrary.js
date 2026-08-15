"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { captureAnalyticsEvent } from "../../lib/analytics/client.js";
import styles from "./Resources.module.css";

const CATEGORIES = [
  { id: "all", label: "Todo" },
  { id: "serum", label: "Serum" },
  { id: "midi", label: "MIDI" },
  { id: "fx", label: "FX" },
  { id: "template", label: "Plantillas" },
  { id: "samples", label: "Samples" },
  { id: "oneshot", label: "One-shots" },
  { id: "other", label: "Otros" },
];

const CATEGORY_ICON = {
  serum: "◉",
  midi: "♫",
  fx: "⌁",
  template: "▦",
  samples: "≋",
  oneshot: "◒",
  other: "◇",
};

const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.filter((category) => category.id !== "all")
    .map((category) => [category.id, category.label]),
);

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(value > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function GateDialog({ resource, onClose, turnstileSiteKey }) {
  const dialogRef = useRef(null);
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [developmentUrl, setDevelopmentUrl] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    captureAnalyticsEvent("resource_gate_opened", {
      resource_slug: resource.slug,
      resource_category: resource.category,
    });
    const handleClose = () => {
      captureAnalyticsEvent("resource_gate_closed", {
        resource_slug: resource.slug,
        completion_state: stateRef.current,
      });
      onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose, resource.category, resource.slug]);

  useEffect(() => {
    const siteKey = turnstileSiteKey;
    if (!siteKey || !turnstileRef.current) return undefined;
    let widgetId;
    let cancelled = false;
    let attempts = 0;

    const renderWidget = () => {
      if (cancelled || widgetId !== undefined) return;
      if (window.turnstile) {
        widgetId = window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: setTurnstileToken,
          "expired-callback": () => setTurnstileToken(""),
          "error-callback": () => setTurnstileToken(""),
        });
        turnstileWidgetIdRef.current = widgetId;
        return;
      }
      attempts += 1;
      if (attempts < 50) window.setTimeout(renderWidget, 100);
    };

    if (!document.querySelector('script[data-ktr3-turnstile="true"]')) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.ktr3Turnstile = "true";
      script.addEventListener("load", renderWidget, { once: true });
      document.head.appendChild(script);
    } else {
      renderWidget();
    }

    return () => {
      cancelled = true;
      if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId);
      turnstileWidgetIdRef.current = null;
    };
  }, [turnstileSiteKey]);

  async function handleSubmit(event) {
    event.preventDefault();
    setState("submitting");
    setMessage("");
    setDevelopmentUrl("");
    const form = new FormData(event.currentTarget);
    const marketingConsent = form.get("marketingConsent") === "on";
    captureAnalyticsEvent("resource_gate_submitted", {
      resource_slug: resource.slug,
      resource_category: resource.category,
      marketing_opt_in: marketingConsent,
    });

    try {
      const response = await fetch(`/api/resources/${resource.slug}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          name: form.get("name"),
          marketingConsent,
          turnstileToken,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo preparar la descarga");
      setState("sent");
      setMessage("Revisa tu correo. El enlace de descarga ya está en camino.");
      if (payload.developmentDownloadUrl) setDevelopmentUrl(payload.developmentDownloadUrl);
      captureAnalyticsEvent("resource_gate_completed", {
        resource_slug: resource.slug,
        resource_category: resource.category,
        marketing_opt_in: marketingConsent,
      });
    } catch (error) {
      setState("error");
      setMessage(error.message);
      setTurnstileToken("");
      if (window.turnstile && turnstileWidgetIdRef.current !== null) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
      captureAnalyticsEvent("resource_gate_failed", {
        resource_slug: resource.slug,
        resource_category: resource.category,
      });
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ph-no-capture`}
      data-ph-no-autocapture="true"
      aria-labelledby="gate-title"
    >
      <button
        type="button"
        className={styles.dialogClose}
        onClick={() => dialogRef.current?.close()}
        aria-label="Cerrar ventana"
      >
        ×
      </button>
      <div className={styles.dialogEyebrow}>SECURE DOWNLOAD://</div>
      <h2 id="gate-title">{resource.title}</h2>
      <p className={styles.dialogIntro}>
        Te enviaremos un enlace privado que caduca en 24 horas.
      </p>

      {state === "sent" ? (
        <div className={styles.successState} aria-live="polite">
          <span aria-hidden="true">✓</span>
          <p>{message}</p>
          {developmentUrl && (
            <a href={developmentUrl}>Abrir descarga de desarrollo</a>
          )}
        </div>
      ) : (
        <form className={styles.gateForm} onSubmit={handleSubmit}>
          <label htmlFor="resource-name">Nombre <span>(opcional)</span></label>
          <input id="resource-name" name="name" type="text" maxLength="80" autoComplete="name" />

          <label htmlFor="resource-email">Email <b aria-hidden="true">*</b></label>
          <input id="resource-email" name="email" type="email" required autoComplete="email" />

          <label className={styles.consent}>
            <input name="marketingConsent" type="checkbox" />
            <span>
              Quiero recibir nuevos recursos y tips de producción. Podré darme de baja cuando quiera.
            </span>
          </label>

          <p className={styles.privacyNote}>
            El email se usa para entregar este recurso. La suscripción a tips es opcional y requiere confirmación.
          </p>
          <div ref={turnstileRef} className={styles.turnstile} aria-label="Comprobación anti-spam" />
          <button className={styles.primaryButton} disabled={state === "submitting"} type="submit">
            {state === "submitting" ? "Preparando enlace…" : "Enviarme el recurso"}
          </button>
          {message && (
            <p className={styles.formError} role="alert">{message}</p>
          )}
        </form>
      )}
    </dialog>
  );
}

function ResourceCard({ resource, onRequest }) {
  const articleRef = useRef(null);
  const previewMilestones = useRef(new Set());

  useEffect(() => {
    const article = articleRef.current;
    if (!article || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      captureAnalyticsEvent("resource_card_viewed", {
        resource_slug: resource.slug,
        resource_category: resource.category,
        access_model: resource.accessModel,
      });
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(article);
    return () => observer.disconnect();
  }, [resource.accessModel, resource.category, resource.slug]);

  const download = () => {
    captureAnalyticsEvent("resource_download_requested", {
      resource_slug: resource.slug,
      resource_category: resource.category,
      access_model: resource.accessModel,
    });
    if (resource.accessModel === "open") {
      window.location.href = `/api/resources/${resource.slug}/download`;
      return;
    }
    onRequest(resource);
  };

  const previewStarted = () => {
    if (previewMilestones.current.has("started")) return;
    previewMilestones.current.add("started");
    captureAnalyticsEvent("resource_preview_started", {
      resource_slug: resource.slug,
      resource_category: resource.category,
    });
  };

  const previewProgress = (event) => {
    const audio = event.currentTarget;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const percentage = Math.round((audio.currentTime / audio.duration) * 100);
    for (const milestone of [25, 50, 75]) {
      if (percentage >= milestone && !previewMilestones.current.has(milestone)) {
        previewMilestones.current.add(milestone);
        captureAnalyticsEvent("resource_preview_progress", {
          resource_slug: resource.slug,
          resource_category: resource.category,
          progress_percent: milestone,
        });
      }
    }
  };

  const previewCompleted = () => {
    if (previewMilestones.current.has("completed")) return;
    previewMilestones.current.add("completed");
    captureAnalyticsEvent("resource_preview_completed", {
      resource_slug: resource.slug,
      resource_category: resource.category,
    });
  };

  return (
    <article ref={articleRef} className={styles.card} id={resource.slug}>
      <div className={styles.cover}>
        {resource.hasCover ? (
          <img
            src={`/api/resources/${resource.slug}/asset/cover`}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className={styles.coverFallback} aria-hidden="true">
            <span>{CATEGORY_ICON[resource.category]}</span>
            <small>KTR3 ORIGINAL</small>
          </div>
        )}
        <div className={styles.accessBadge}>
          {resource.accessModel === "open" ? "Descarga directa" : "Entrega por email"}
        </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardMeta}>
          <span>{CATEGORY_LABEL[resource.category] || resource.category}</span>
          <span>{formatBytes(resource.file.size)}</span>
        </div>
        <h2>{resource.title}</h2>
        <p>{resource.summary}</p>
        <details
          className={styles.details}
          onToggle={(event) => {
            if (event.currentTarget.open) {
              captureAnalyticsEvent("resource_details_opened", {
                resource_slug: resource.slug,
                resource_category: resource.category,
              });
            }
          }}
        >
          <summary>Ver detalles</summary>
          <p>{resource.description}</p>
        </details>
        {resource.tags.length > 0 && (
          <ul className={styles.tags} aria-label="Etiquetas">
            {resource.tags.map((tag) => <li key={tag}>#{tag}</li>)}
          </ul>
        )}
        {resource.hasPreview && (
          <audio
            className={styles.preview}
            controls
            preload="none"
            src={`/api/resources/${resource.slug}/asset/preview`}
            onPlay={previewStarted}
            onTimeUpdate={previewProgress}
            onEnded={previewCompleted}
          >
            Tu navegador no puede reproducir esta demo.
          </audio>
        )}
        <button className={styles.cardButton} type="button" onClick={download}>
          <span>{resource.accessModel === "open" ? "Descargar" : "Obtener recurso"}</span>
          <span aria-hidden="true">↓</span>
        </button>
        <div className={styles.downloadCount}>
          {resource.downloadCount === 1 ? "1 descarga" : `${resource.downloadCount} descargas`}
        </div>
      </div>
    </article>
  );
}

export default function ResourceLibrary({ initialResources, unavailable, turnstileSiteKey }) {
  const [category, setCategory] = useState("all");
  const [selectedResource, setSelectedResource] = useState(null);
  const [newsletterState, setNewsletterState] = useState("");

  useEffect(() => {
    setNewsletterState(new URLSearchParams(window.location.search).get("newsletter") || "");
  }, []);

  const counts = useMemo(() => {
    const result = { all: initialResources.length };
    for (const resource of initialResources) {
      result[resource.category] = (result[resource.category] || 0) + 1;
    }
    return result;
  }, [initialResources]);

  const visibleResources = category === "all"
    ? initialResources
    : initialResources.filter((resource) => resource.category === category);

  const newsletterMessages = {
    confirmed: "Suscripción confirmada. Bienvenido a la comunidad Ktr3.",
    unsubscribed: "Te has dado de baja correctamente.",
    invalid: "Ese enlace ya no es válido o ha caducado.",
  };

  return (
    <>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Navegación principal">
          <a href="/" className={styles.brand} aria-label="Volver a Ktr3">
            <img src="/logo.png" alt="" />
            <span>KTR3</span>
          </a>
          <div className={styles.navStatus}>
            <span aria-hidden="true" />
            resource server online
          </div>
          <a href="/" className={styles.backLink}>← ktr3.es</a>
        </nav>

        <div className={styles.hero}>
          <div>
            <p className={styles.kicker}>KTR3://PRODUCER_RESOURCES</p>
            <h1>Sonidos para llevar<br /><em>tus ideas más lejos.</em></h1>
            <p className={styles.heroCopy}>
              Presets, MIDI, efectos y plantillas creadas desde mis propias sesiones.
              Sin relleno. Listas para producir.
            </p>
          </div>
          <div className={styles.heroTerminal} aria-label="Información del catálogo">
            <div><i /> <i /> <i /></div>
            <code>
              <span>$ ./ktr3-vault --status</span>
              <b>{initialResources.length} archivos disponibles</b>
              <b>100% creados por Ktr3</b>
              <b>actualizaciones en progreso_</b>
            </code>
          </div>
        </div>
      </header>

      {newsletterState && newsletterMessages[newsletterState] && (
        <div
          className={`${styles.notice} ${newsletterState === "invalid" ? styles.noticeError : ""}`}
          role="status"
        >
          {newsletterMessages[newsletterState]}
        </div>
      )}

      <section className={styles.catalog} aria-labelledby="catalog-title">
        <div className={styles.catalogHeading}>
          <div>
            <p>EXPLORAR ARCHIVOS</p>
            <h2 id="catalog-title">Elige tu próximo sonido</h2>
          </div>
          <span>{visibleResources.length.toString().padStart(2, "0")} resultados</span>
        </div>

        <div className={styles.filters} aria-label="Filtrar por categoría">
          {CATEGORIES.filter((item) => item.id === "all" || counts[item.id]).map((item) => (
            <button
              key={item.id}
              type="button"
              className={category === item.id ? styles.filterActive : ""}
              aria-pressed={category === item.id}
              onClick={() => {
                setCategory(item.id);
                captureAnalyticsEvent("resource_filter_selected", {
                  resource_category: item.id,
                  result_count: counts[item.id] || 0,
                });
              }}
            >
              {item.label} <span>{counts[item.id] || 0}</span>
            </button>
          ))}
        </div>

        {unavailable ? (
          <div className={styles.empty} role="alert">
            <b>CATALOG_OFFLINE</b>
            <p>No se ha podido conectar con la biblioteca. Vuelve a intentarlo en unos minutos.</p>
          </div>
        ) : visibleResources.length === 0 ? (
          <div className={styles.empty}>
            <b>PRÓXIMO DROP EN CAMINO</b>
            <p>Estoy preparando los primeros recursos. Sígueme para enterarte del lanzamiento.</p>
            <a href="https://www.instagram.com/ktr3ss/">Seguir a @ktr3ss</a>
          </div>
        ) : (
          <div className={styles.grid} id="resource-grid">
            {visibleResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} onRequest={setSelectedResource} />
            ))}
          </div>
        )}
      </section>

      <section className={styles.community}>
        <p>NO SOLO ARCHIVOS</p>
        <h2>Una biblioteca que crecerá<br />con la comunidad.</h2>
        <div>
          <span>01</span><p>Nuevos drops creados a partir de mis vídeos y sesiones.</p>
          <span>02</span><p>Tips de producción breves, aplicables y sin spam.</p>
          <span>03</span><p>Recursos premium y proyectos completos más adelante.</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>KTR3 RESOURCES © 2026</span>
        <a href="mailto:prod.ktr3@gmail.com">Contacto</a>
        <a href="https://www.instagram.com/ktr3ss/">Instagram</a>
        <a href="/privacidad">Privacidad</a>
        <a href="/cookies">Cookies</a>
        <a href="/legal">Legal</a>
      </footer>

      {selectedResource && (
        <GateDialog
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          turnstileSiteKey={turnstileSiteKey}
        />
      )}
    </>
  );
}
