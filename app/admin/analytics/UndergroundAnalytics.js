"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import adminStyles from "../Admin.module.css";
import styles from "./Analytics.module.css";

const EMPTY_DATA = {
  summary: {},
  profiles: [],
  platforms: [],
  roles: [],
  daily: [],
};

const ROLE_LABELS = {
  all: "Todo",
  artist: "Artistas",
  producer: "Productores",
  dj: "DJ",
  collective: "Colectivos",
  visual: "Visuales",
};

const PLATFORM_LABELS = {
  instagram: "Instagram",
  youtube: "YouTube",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  tiktok: "TikTok",
  apple_music: "Apple Music",
  beatstars: "BeatStars",
  website: "Web",
};

function number(value) {
  return new Intl.NumberFormat("es-ES").format(Number(value) || 0);
}

function shortDate(value) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(new Date(value));
}

function BarList({ rows, valueKey, labelKey, labels = {} }) {
  const maximum = Math.max(1, ...rows.map((row) => Number(row[valueKey]) || 0));
  if (!rows.length) return <p className={styles.empty}>Aún no hay datos en este periodo.</p>;
  return (
    <div className={styles.barList}>
      {rows.map((row) => {
        const value = Number(row[valueKey]) || 0;
        const rawLabel = row[labelKey] || "unknown";
        return (
          <div className={styles.barRow} key={rawLabel}>
            <div><span>{labels[rawLabel] || rawLabel}</span><b>{number(value)}</b></div>
            <i aria-hidden="true"><span style={{ width: `${Math.max(3, (value / maximum) * 100)}%` }} /></i>
          </div>
        );
      })}
    </div>
  );
}

export default function UndergroundAnalytics({ admin }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(EMPTY_DATA);
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/analytics/underground?days=${days}`, { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudieron cargar las métricas");
      setData(payload);
      setState("ready");
    } catch (error) {
      setMessage(error.message);
      setState("error");
    }
  }, [days]);

  useEffect(() => { refresh(); }, [refresh]);

  const dailyMaximum = useMemo(() => Math.max(
    1,
    ...data.daily.map((item) => Math.max(Number(item.profileOpens), Number(item.externalClicks))),
  ), [data.daily]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const summary = data.summary || {};
  return (
    <main className={`${adminStyles.adminPage} ${styles.analyticsPage}`}>
      <header className={adminStyles.adminHeader}>
        <a href="/admin" className={adminStyles.adminBrand}><img src="/logo.png" alt="" /><span>KTR3 CONTROL</span></a>
        <div className={adminStyles.adminIdentity}>
          <span><i /> {admin.displayName}</span>
          <a href="/admin">Recursos</a>
          <a href="/underground" target="_blank">Ver Underground ↗</a>
          <button type="button" onClick={logout}>Salir</button>
        </div>
      </header>

      <div className={adminStyles.adminShell}>
        <section className={styles.hero}>
          <div>
            <p>UNDERGROUND_ANALYTICS://PRIVATE</p>
            <h1>La escena,<br />en datos.</h1>
          </div>
          <div className={styles.heroAside}>
            <label htmlFor="analytics-range">Periodo</label>
            <select id="analytics-range" value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </select>
            <small>Solo datos agregados de personas que aceptaron analítica.</small>
          </div>
        </section>

        <div className={styles.statusLine} aria-live="polite">
          {state === "loading" && "Actualizando métricas…"}
          {state === "error" && `Error: ${message}`}
        </div>

        <section className={styles.metricGrid} aria-label="Resumen de Underground">
          <article><span>Visitantes únicos</span><b>{number(summary.uniqueVisitors)}</b><small>seudónimos en el periodo</small></article>
          <article><span>Perfiles abiertos</span><b>{number(summary.profileOpens)}</b><small>fichas consultadas</small></article>
          <article><span>Salidas</span><b>{number(summary.externalClicks)}</b><small>clics a plataformas</small></article>
          <article><span>Tasa de salida</span><b>{number(summary.outboundRate)}%</b><small>salidas / fichas abiertas</small></article>
          <article><span>RANDOM</span><b>{number(summary.randomImpressions)}</b><small>artistas mostrados</small></article>
          <article><span>Búsquedas</span><b>{number(summary.searches)}</b><small>{number(summary.searchSelections)} resultados elegidos</small></article>
        </section>

        <section className={styles.panel} aria-labelledby="activity-title">
          <div className={styles.panelHeading}>
            <div><span>TREND_LINE</span><h2 id="activity-title">Actividad diaria</h2></div>
            <div className={styles.legend}><i /> Perfiles <i /> Salidas</div>
          </div>
          {!data.daily.length ? <p className={styles.empty}>La gráfica aparecerá cuando lleguen los primeros eventos consentidos.</p> : (
            <div className={styles.chart} role="img" aria-label="Gráfico diario de perfiles abiertos y salidas a plataformas">
              {data.daily.map((item) => (
                <div className={styles.chartDay} key={item.day}>
                  <div className={styles.columns}>
                    <i style={{ height: `${Math.max(3, (Number(item.profileOpens) / dailyMaximum) * 100)}%` }} title={`${item.profileOpens} perfiles`} />
                    <i style={{ height: `${Math.max(3, (Number(item.externalClicks) / dailyMaximum) * 100)}%` }} title={`${item.externalClicks} salidas`} />
                  </div>
                  <span>{shortDate(item.day)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className={styles.splitPanels}>
          <section className={styles.panel} aria-labelledby="platform-title">
            <div className={styles.panelHeading}><div><span>OUTBOUND</span><h2 id="platform-title">Plataformas</h2></div></div>
            <BarList rows={data.platforms} valueKey="clicks" labelKey="platform" labels={PLATFORM_LABELS} />
          </section>
          <section className={styles.panel} aria-labelledby="roles-title">
            <div className={styles.panelHeading}><div><span>DISCOVERY</span><h2 id="roles-title">Filtros elegidos</h2></div></div>
            <BarList rows={data.roles} valueKey="selections" labelKey="role" labels={ROLE_LABELS} />
          </section>
        </div>

        <section className={styles.panel} aria-labelledby="profiles-title">
          <div className={styles.panelHeading}>
            <div><span>PROFILE_RANKING</span><h2 id="profiles-title">Descubrimiento por perfil</h2></div>
            <b>{data.profiles.length} perfiles con actividad</b>
          </div>
          <div className={styles.tableScroll}>
            <table>
              <thead><tr><th>Perfil</th><th>Rol</th><th>RANDOM</th><th>Aperturas</th><th>Desde búsqueda</th><th>Salidas</th><th>Tasa</th><th>Únicos</th></tr></thead>
              <tbody>
                {!data.profiles.length ? (
                  <tr><td colSpan="8" className={styles.tableEmpty}>Aún no hay perfiles con actividad consentida.</td></tr>
                ) : data.profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td><strong>{profile.displayName}</strong></td>
                    <td>{ROLE_LABELS[profile.primaryRole] || profile.primaryRole}</td>
                    <td>{number(profile.randomImpressions)}</td>
                    <td>{number(profile.profileOpens)}</td>
                    <td>{number(profile.searchSelections)}</td>
                    <td>{number(profile.externalClicks)}</td>
                    <td>{number(profile.outboundRate)}%</td>
                    <td>{number(profile.uniqueVisitors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className={styles.privacyNote}>No se muestran IP, email, búsquedas, sesiones individuales ni URLs. Los eventos detallados se eliminan a los 14 meses.</p>
      </div>
    </main>
  );
}
