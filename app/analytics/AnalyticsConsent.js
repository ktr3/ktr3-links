"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
  OPEN_CONSENT_EVENT,
  createConsentChoice,
  parseStoredConsent,
} from "../../lib/analytics/consent.js";
import {
  captureAnalyticsEvent,
  startAnalytics,
  stopAnalytics,
} from "../../lib/analytics/client.js";
import { describeLink, shouldTrackPath } from "../../lib/analytics/privacy.js";
import { clearUndergroundAnalyticsIdentity } from "../../lib/analytics/underground-client.js";
import styles from "./AnalyticsConsent.module.css";

const POSTHOG_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
const SCROLL_DEPTHS = [25, 50, 75, 90];

export default function AnalyticsConsent() {
  const [choice, setChoice] = useState(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const pathname = usePathname();
  const dialogRef = useRef(null);
  const reachedDepths = useRef(new Set());
  const privatePath = !shouldTrackPath(pathname);

  const activateAnalytics = useCallback(async () => {
    await startAnalytics({ token: POSTHOG_TOKEN, host: POSTHOG_HOST });
  }, []);

  const applyChoice = useCallback((nextChoice) => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(nextChoice));
    setChoice(nextChoice);
    setAnalyticsEnabled(nextChoice.analytics);
    setSettingsOpen(false);

    if (nextChoice.analytics) activateAnalytics();
    else {
      stopAnalytics();
      clearUndergroundAnalyticsIdentity();
    }

    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: nextChoice }));
  }, [activateAnalytics]);

  useEffect(() => {
    if (!shouldTrackPath(pathname)) return;
    const stored = parseStoredConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
    setChoice(stored);
    setAnalyticsEnabled(stored?.analytics === true);
    if (stored?.analytics) activateAnalytics();
    else clearUndergroundAnalyticsIdentity();

    const openSettings = () => setSettingsOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, openSettings);
  }, [activateAnalytics, pathname]);

  useEffect(() => {
    if (privatePath) {
      stopAnalytics();
      return;
    }
    if (choice?.analytics) activateAnalytics();
  }, [activateAnalytics, choice?.analytics, privatePath]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (settingsOpen && !dialog.open) dialog.showModal();
    if (!settingsOpen && dialog.open) dialog.close();
  }, [settingsOpen]);

  useEffect(() => {
    if (!choice?.analytics) return undefined;
    const measureScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const depth = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      for (const milestone of SCROLL_DEPTHS) {
        if (depth >= milestone && !reachedDepths.current.has(milestone)) {
          reachedDepths.current.add(milestone);
          captureAnalyticsEvent("scroll_depth_reached", { depth_percent: milestone });
        }
      }
    };
    window.addEventListener("scroll", measureScroll, { passive: true });
    measureScroll();
    return () => window.removeEventListener("scroll", measureScroll);
  }, [choice?.analytics]);

  useEffect(() => {
    if (!choice?.analytics || privatePath) return undefined;
    const trackLink = (event) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor || anchor.dataset.analyticsIgnore === "true") return;
      const properties = describeLink(anchor.getAttribute("href"), window.location.origin);
      if (properties) captureAnalyticsEvent("link_clicked", properties);
    };
    document.addEventListener("click", trackLink, true);
    return () => document.removeEventListener("click", trackLink, true);
  }, [choice?.analytics, privatePath]);

  if (privatePath || choice === undefined) return null;

  const accept = () => applyChoice(createConsentChoice({ analytics: true }));
  const reject = () => applyChoice(createConsentChoice({ analytics: false }));
  const saveSettings = () => applyChoice(createConsentChoice({ analytics: analyticsEnabled }));

  return (
    <>
      {!choice && (
        <section className={styles.banner} aria-label="Preferencias de privacidad">
          <div className={styles.copy}>
            <span>KTR3://PRIVACY</span>
            <h2>Tú eliges qué medimos.</h2>
            <p>
              Las cookies necesarias mantienen la web funcionando. Con tu permiso usamos analítica,
              mapas de calor y sesiones enmascaradas para mejorar recursos y navegación.
            </p>
            <div className={styles.links}>
              <a href="/privacidad">Privacidad</a>
              <a href="/cookies">Cookies</a>
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={accept}>Aceptar analítica</button>
            <button type="button" className={styles.primary} onClick={reject}>Rechazar</button>
            <button type="button" className={styles.secondary} onClick={() => setSettingsOpen(true)}>Configurar</button>
          </div>
        </section>
      )}

      {choice && (
        <button
          type="button"
          className={styles.privacyButton}
          onClick={() => setSettingsOpen(true)}
          aria-label="Abrir preferencias de privacidad"
        >
          Privacidad
        </button>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-modal="true"
        aria-labelledby="privacy-settings-title"
        onClose={() => setSettingsOpen(false)}
      >
        <button
          type="button"
          className={styles.close}
          onClick={() => setSettingsOpen(false)}
          aria-label="Cerrar preferencias"
        >
          ×
        </button>
        <span className={styles.eyebrow}>CONTROL_PANEL://</span>
        <h2 id="privacy-settings-title">Preferencias de privacidad</h2>
        <div className={styles.category}>
          <div>
            <strong>Necesarias</strong>
            <p>Sesión administrativa, seguridad y funciones solicitadas.</p>
          </div>
          <span className={styles.alwaysOn}>Siempre activas</span>
        </div>
        <label className={styles.category}>
          <div>
            <strong>Analítica y experiencia</strong>
            <p>Clics, scroll, rendimiento, embudos, mapas de calor y sesiones enmascaradas.</p>
          </div>
          <input
            type="checkbox"
            checked={analyticsEnabled}
            onChange={(event) => setAnalyticsEnabled(event.target.checked)}
          />
        </label>
        <p className={styles.safety}>
          Nunca grabamos contraseñas, emails introducidos, el panel de administración ni contenido de formularios.
        </p>
        <div className={styles.dialogLinks}>
          <a href="/privacidad">Política de privacidad</a>
          <a href="/cookies">Política de cookies</a>
        </div>
        <button type="button" className={styles.save} onClick={saveSettings}>Guardar preferencias</button>
      </dialog>
    </>
  );
}
