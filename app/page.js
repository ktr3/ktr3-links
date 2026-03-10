"use client";

import { useState, useEffect } from "react";

const LINKS = [
  {
    id: "beatstars",
    label: "BeatStars",
    sub: "Compra beats exclusivos & con licencia",
    url: "https://www.beatstars.com/ktr3",
    icon: "🎹",
    color: "#e23636",
  },
  {
    id: "youtube",
    label: "YouTube",
    sub: "Beats, type beats & más",
    url: "https://www.youtube.com/@prodbyktr3",
    icon: "▶️",
    color: "#ff0000",
  },
  {
    id: "soundcloud",
    label: "SoundCloud",
    sub: "Escucha mi catálogo completo",
    url: "https://soundcloud.com/ktr3",
    icon: "🔊",
    color: "#ff5500",
  },
  {
    id: "instagram",
    label: "Instagram",
    sub: "@ktr3ss",
    url: "https://www.instagram.com/ktr3ss/",
    icon: "📸",
    color: "#e1306c",
  },
];

function useTheme() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("ktr3_theme");
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ktr3_theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

export default function Home() {
  const [hoveredLink, setHoveredLink] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Ktr3 — Productor Musical",
        text: "Mira el perfil de Ktr3 — beats, redes y más",
        url: "https://ktr3.es",
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText("https://ktr3.es").then(() => {
        alert("Link copiado!");
      }).catch(() => {});
    }
  };

  return (
    <main className={`page ${mounted ? "mounted" : ""}`}>
      {/* Background glow */}
      <div className="bg-glow" />

      {/* Top controls */}
      <div className="top-controls">
        <button className="control-btn" onClick={toggleTheme} title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <button className="control-btn" onClick={handleShare} title="Compartir">
          ↗
        </button>
      </div>

      {/* Profile section */}
      <section className="profile">
        <div className="avatar-ring">
          <img src="/logo.png" alt="Ktr3" className="avatar" />
        </div>
        <h1 className="name">Ktr3</h1>
        <p className="tagline">Productor Musical</p>
        <div className="badges">
          <span className="badge">Beats</span>
          <span className="badge">Trap</span>
          <span className="badge">Hip Hop</span>
        </div>
      </section>

      {/* Links section */}
      <section className="links">
        {LINKS.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`link-card ${hoveredLink === link.id ? "hovered" : ""}`}
            onMouseEnter={() => setHoveredLink(link.id)}
            onMouseLeave={() => setHoveredLink(null)}
            style={{ "--accent": link.color }}
          >
            <span className="link-icon">{link.icon}</span>
            <div className="link-text">
              <span className="link-label">{link.label}</span>
              <span className="link-sub">{link.sub}</span>
            </div>
            <span className="link-arrow">→</span>
          </a>
        ))}
      </section>

      {/* Featured beat — SoundCloud embed */}
      <section className="section">
        <h2 className="section-title">Escucha mis beats</h2>
        <div className="beat-player">
          <iframe
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/ktr3&color=%23a855f7&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false"
            style={{ border: "none" }}
          />
        </div>
        <div className="cta-row">
          <a
            href="https://www.beatstars.com/ktr3"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-btn"
          >
            Comprar beats →
          </a>
          <a
            href="https://soundcloud.com/ktr3"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-btn cta-secondary"
          >
            SoundCloud →
          </a>
        </div>
      </section>

      {/* Contact */}
      <section className="section">
        <button className="contact-toggle" onClick={() => setShowContact(!showContact)}>
          {showContact ? "Ocultar contacto" : "Contacto & Colaboraciones"} {showContact ? "▲" : "▼"}
        </button>
        {showContact && (
          <div className="contact-panel">
            <p className="contact-text">
              Para beats custom, colaboraciones o consultas:
            </p>
            <a href="mailto:prod.ktr3@gmail.com" className="contact-link">
              prod.ktr3@gmail.com
            </a>
            <div className="contact-note">
              DM por Instagram también funciona
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <span>© {new Date().getFullYear()} Ktr3</span>
      </footer>
    </main>
  );
}
