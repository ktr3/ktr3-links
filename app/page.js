"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

const SOCIAL_LINKS = [
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/ktr3ss/", icon: "/icons/instagram.svg" },
  { id: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@ktr3ss", icon: "/icons/tiktok.svg" },
  { id: "youtube", label: "YouTube", url: "https://www.youtube.com/@prodbyktr3", icon: "/icons/youtube.svg" },
  { id: "soundcloud", label: "SoundCloud", url: "https://soundcloud.com/ktr3", icon: "/icons/soundcloud.svg" },
  { id: "beatstars", label: "BeatStars", url: "https://www.beatstars.com/ktr3", icon: "/icons/beatstars.svg" },
  { id: "email", label: "Email", url: "mailto:prod.ktr3@gmail.com", icon: "/icons/email.svg" },
];

const FOLDERS = [
  { id: "beats", label: "Beats", icon: "🎵" },
  { id: "proyectos", label: "Proyectos", icon: "🚀" },
  { id: "underground", label: "Underground GZK", icon: "🌐", href: "/underground" },
  { id: "sobre-mi", label: "Sobre Ktr3", icon: "👤" },
  { id: "contacto", label: "Contacto", icon: "📬" },
];

const PROJECTS = [
  {
    id: "beatstars-store",
    name: "BeatStars Store",
    category: "Beats · Tienda Online",
    url: "https://www.beatstars.com/ktr3",
    icon: "🎹",
    stats: [
      { label: "Beats", value: "50+" },
      { label: "Ventas", value: "---" },
      { label: "Estilos", value: "3+" },
    ],
    features: [
      "Beats exclusivos y con licencia",
      "Trap, Hip Hop, R&B & mas",
      "Descarga instantanea",
      "Licencias desde $20",
      "Custom beats disponibles",
    ],
  },
  {
    id: "youtube-channel",
    name: "YouTube Channel",
    category: "Contenido · Type Beats",
    url: "https://www.youtube.com/@prodbyktr3",
    icon: "▶️",
    stats: [
      { label: "Videos", value: "---" },
      { label: "Subs", value: "---" },
      { label: "Type Beats", value: "Si" },
    ],
    features: [
      "Type beats semanales",
      "Free beats con tag",
      "Beats con visualizer",
      "Trap & Hip Hop beats",
    ],
  },
];

const BEATS_CONTENT = {
  title: "Mis Beats",
  description: "Escucha y compra beats directamente. Trap, Hip Hop, R&B y mas.",
  soundcloudEmbed: "https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/ktr3&color=%23a855f7&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false",
};

const ABOUT_CONTENT = {
  bio: "Productor musical especializado en Trap y Hip Hop.",
  skills: ["Trap", "Hip Hop", "Mixing", "Sound Design"],
  tools: ["FL Studio", "Pro Tools"],
};

/* ═══════════════════════════════════════════
   TERMINAL COMMANDS
   ═══════════════════════════════════════════ */

const TERMINAL_COMMANDS = {
  help: () => [
    "Comandos disponibles:",
    "  help        - Muestra esta ayuda",
    "  play        - Ultimo lanzamiento",
    "  beats       - Ir a mis beats",
    "  underground - Escena urbana de Gipuzkoa",
    "  contact     - Info de contacto",
    "  about       - Sobre mi",
    "  socials     - Mis redes",
    "  clear       - Limpiar terminal",
    "  matrix      - ???",
    "  sudo make me a beat - ???",
    "  neofetch    - Info del sistema",
  ],
  play: () => ["Abriendo ultimo lanzamiento...", "__ACTION__:url:https://www.youtube.com/watch?v=tMkv0ga4C1I"],
  beats: () => ["Cargando beats...", "__ACTION__:nav:beats"],
  underground: () => ["Abriendo Gipuzkoa Underground...", "__ACTION__:url:/underground"],
  contact: () => [
    "Email: prod.ktr3@gmail.com",
    "Instagram: @ktr3ss",
    "DM abiertos para colaboraciones",
  ],
  about: () => ["Cargando bio...", "__ACTION__:nav:sobre-mi"],
  socials: () => [
    "Instagram  → instagram.com/ktr3ss",
    "YouTube    → youtube.com/@prodbyktr3",
    "SoundCloud → soundcloud.com/ktr3",
    "BeatStars  → beatstars.com/ktr3",
  ],
  neofetch: () => [
    "        ██╗  ██╗██████╗ ",
    "        ██║ ██╔╝╚════██╗",
    "        █████╔╝  █████╔╝",
    "        ██╔═██╗  ╚═══██╗",
    "        ██║  ██╗██████╔╝",
    "        ╚═╝  ╚═╝╚═════╝ ",
    "",
    "  OS:      Ktr3OS v2.0",
    "  Host:    ktr3.es",
    "  Shell:   ktr3-terminal",
    "  DAW:     FL Studio",
    "  Genre:   Trap / Hip Hop / R&B",
    "  Status:  Making beats...",
  ],
  matrix: () => ["__ACTION__:matrix"],
  "sudo make me a beat": () => [
    "[sudo] password for ktr3: ********",
    "Generando beat...",
    "████████████████████ 100%",
    "Beat generado. Mentira, los hago yo a mano.",
    "Visita beatstars.com/ktr3 para beats de verdad",
  ],
  whoami: () => ["ktr3 - productor musical & beatmaker"],
  pwd: () => ["/home/ktr3/studio"],
  ls: () => ["beats/  proyectos/  samples/  plugins/  README.md"],
  date: () => [new Date().toLocaleString("es-ES")],
  echo: (args) => [args || ""],
};

const SPOTLIGHT_ITEMS = [
  { id: "beats", label: "Beats", sub: "Escucha y compra beats", icon: "🎵", action: "beats" },
  { id: "proyectos", label: "Proyectos", sub: "Mis proyectos y plataformas", icon: "🚀", action: "proyectos" },
  { id: "underground", label: "Underground GZK", sub: "Escena urbana de Gipuzkoa", icon: "🌐", action: "url:/underground" },
  { id: "sobre-mi", label: "Sobre Ktr3", sub: "Bio, estilos y herramientas", icon: "👤", action: "sobre-mi" },
  { id: "contacto", label: "Contacto", sub: "Email y colaboraciones", icon: "📬", action: "contacto" },
  { id: "beatstars", label: "BeatStars", sub: "Comprar beats online", icon: "🎹", action: "url:https://www.beatstars.com/ktr3" },
  { id: "youtube", label: "YouTube", sub: "Type beats y contenido", icon: "▶️", action: "url:https://www.youtube.com/@prodbyktr3" },
  { id: "instagram", label: "Instagram", sub: "@ktr3ss", icon: "📸", action: "url:https://www.instagram.com/ktr3ss/" },
  { id: "soundcloud", label: "SoundCloud", sub: "Catalogo completo", icon: "🔊", action: "url:https://soundcloud.com/ktr3" },
];

/* ═══════════════════════════════════════════
   BOOT SCREEN
   ═══════════════════════════════════════════ */

function playStartupChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // Mac startup chime: layered harmonics in F# major chord
    const notes = [
      { freq: 185.00, gain: 0.25, start: 0,    end: 3.0 },  // F#3
      { freq: 277.18, gain: 0.20, start: 0,    end: 2.8 },  // C#4
      { freq: 369.99, gain: 0.18, start: 0,    end: 2.6 },  // F#4
      { freq: 554.37, gain: 0.12, start: 0,    end: 2.2 },  // C#5
      { freq: 739.99, gain: 0.08, start: 0,    end: 2.0 },  // F#5
      { freq: 1108.7, gain: 0.05, start: 0,    end: 1.6 },  // C#6
    ];

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.35, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 3.2);
    master.connect(ctx.destination);

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(n.gain, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.end);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + n.start);
      osc.stop(now + n.end + 0.1);
    }

    // Subtle shimmer overtone
    const shimmer = ctx.createOscillator();
    const shimGain = ctx.createGain();
    shimmer.type = "triangle";
    shimmer.frequency.value = 1480;
    shimGain.gain.setValueAtTime(0.03, now);
    shimGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    shimmer.connect(shimGain);
    shimGain.connect(master);
    shimmer.start(now);
    shimmer.stop(now + 1.6);

    setTimeout(() => ctx.close(), 4000);
  } catch (e) {
    // Audio not available, silently continue
  }
}

function BootScreen({ onComplete }) {
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState(0); // 0=logo, 1=progress, 2=fade

  const handleStart = () => {
    if (started) return;
    setStarted(true);
    playStartupChime();
  };

  useEffect(() => {
    if (!started) return;
    setPhase(0);
    const t0 = setTimeout(() => setPhase(1), 800);
    const t1 = setTimeout(() => setPhase(2), 2600);
    const t2 = setTimeout(onComplete, 3200);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [started, onComplete]);

  return (
    <div className={`boot-screen ${phase >= 2 ? "boot-fade" : ""}`} onClick={handleStart}>
      {!started ? (
        <div className="boot-power">
          <div className="boot-power-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="power-icon">
              <line x1="12" y1="2" x2="12" y2="12" />
              <path d="M18.36 6.64A9 9 0 1 1 5.64 6.64" />
            </svg>
          </div>
          <p className="boot-power-text">click para encender</p>
        </div>
      ) : (
        <>
          <div className={`boot-logo ${phase >= 0 ? "boot-logo-visible" : ""}`}>
            <img src="/logo.png" alt="K3" className="boot-logo-img" />
          </div>
          {phase >= 1 && (
            <div className="boot-progress-wrap">
              <div className="boot-progress-bar">
                <div className="boot-progress-fill" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PARTICLES BACKGROUND
   ═══════════════════════════════════════════ */

function Particles() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Init particles
    const count = 60;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5,
      a: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ps = particlesRef.current;

      for (const p of ps) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${p.a})`;
        ctx.fill();
      }

      // Draw lines between close particles
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x;
          const dy = ps[i].y - ps[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="particles-canvas" />;
}

/* ═══════════════════════════════════════════
   AUDIO VISUALIZER
   ═══════════════════════════════════════════ */

function AudioVisualizer() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const barsRef = useRef(Array.from({ length: 32 }, () => Math.random() * 0.3));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = 520;
    canvas.height = 40;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = barsRef.current;
      const barW = canvas.width / bars.length;

      for (let i = 0; i < bars.length; i++) {
        // Smooth random movement
        bars[i] += (Math.random() - 0.5) * 0.08;
        bars[i] = Math.max(0.05, Math.min(1, bars[i]));

        const h = bars[i] * canvas.height * 0.8;
        const x = i * barW + 2;
        const y = (canvas.height - h) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barW - 4, h, 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${0.15 + bars[i] * 0.2})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return <canvas ref={canvasRef} className="audio-visualizer" />;
}

/* ═══════════════════════════════════════════
   SPOTLIGHT SEARCH
   ═══════════════════════════════════════════ */

function Spotlight({ onClose, onNavigate }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = SPOTLIGHT_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.sub.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item) => {
    if (item.action.startsWith("url:")) {
      window.open(item.action.slice(4), "_blank");
    } else {
      onNavigate(item.action);
    }
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && filtered.length > 0) handleSelect(filtered[0]);
  };

  return (
    <div className="spotlight-overlay" onClick={onClose}>
      <div className="spotlight-modal" onClick={(e) => e.stopPropagation()}>
        <div className="spotlight-input-wrap">
          <span className="spotlight-icon">&#128269;</span>
          <input
            ref={inputRef}
            type="text"
            className="spotlight-input"
            placeholder="Buscar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="spotlight-kbd">ESC</kbd>
        </div>
        {filtered.length > 0 && (
          <div className="spotlight-results">
            {filtered.map((item) => (
              <button key={item.id} className="spotlight-result" onClick={() => handleSelect(item)}>
                <span className="spotlight-result-icon">{item.icon}</span>
                <div className="spotlight-result-text">
                  <span className="spotlight-result-label">{item.label}</span>
                  <span className="spotlight-result-sub">{item.sub}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DOCK COMPONENT (macOS magnification + bounce)
   ═══════════════════════════════════════════ */

function Dock({ dockReady }) {
  const dockRef = useRef(null);
  const [mouseX, setMouseX] = useState(null);

  const handleMouseMove = useCallback((e) => {
    if (!dockRef.current) return;
    const rect = dockRef.current.getBoundingClientRect();
    setMouseX(e.clientX - rect.left);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseX(null);
  }, []);

  return (
    <div className="dock-wrapper">
      <div
        className="dock"
        ref={dockRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {SOCIAL_LINKS.map((link, i) => {
          let scale = 1;
          if (mouseX !== null && dockRef.current) {
            const iconCenter = (i + 0.5) * 64;
            const distance = Math.abs(mouseX - iconCenter);
            scale = Math.max(1, 1.6 - distance / 100);
          }
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`dock-item ${dockReady ? `dock-bounce dock-bounce-${i}` : ""}`}
              title={link.label}
              style={{
                transform: `scale(${scale}) translateY(${(scale - 1) * -24}px)`,
                transition: mouseX !== null ? "transform 0.15s ease" : "transform 0.3s ease",
              }}
            >
              <img src={link.icon} alt={link.label} className="dock-icon" />
              {scale > 1.15 && <span className="dock-tooltip">{link.label}</span>}
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FINDER WINDOW (with genie animation)
   ═══════════════════════════════════════════ */

function FinderWindow({ title, onClose, children, onBack }) {
  return (
    <div className="finder-window animate-genie">
      <div className="finder-titlebar">
        <div className="finder-dots">
          <span className="dot red" onClick={onClose} />
          <span className="dot yellow" />
          <span className="dot green" />
        </div>
        {onBack && (
          <button className="finder-nav-btn" onClick={onBack}>&#8249;</button>
        )}
        <span className="finder-title">{title}</span>
      </div>
      <div className="finder-content">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   APP STORE DETAIL
   ═══════════════════════════════════════════ */

function ProjectDetail({ project, onBack }) {
  return (
    <FinderWindow title={project.name} onClose={onBack} onBack={onBack}>
      <div className="app-store-detail">
        <div className="app-store-header">
          <div className="app-store-icon">{project.icon}</div>
          <div className="app-store-info">
            <h2 className="app-store-name">{project.name}</h2>
            <p className="app-store-category">{project.category}</p>
            <a href={project.url} target="_blank" rel="noopener noreferrer" className="app-store-btn">
              Ver el proyecto
            </a>
          </div>
        </div>
        <div className="app-store-stats">
          {project.stats.map((stat, i) => (
            <div key={i} className="app-store-stat">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
        <div className="app-store-section">
          <h3>Features Top</h3>
          <ul className="app-store-features">
            {project.features.map((f, i) => (
              <li key={i}>&ndash; {f}</li>
            ))}
          </ul>
        </div>
      </div>
    </FinderWindow>
  );
}

/* ═══════════════════════════════════════════
   FOLDER VIEWS
   ═══════════════════════════════════════════ */

function BeatsView({ onBack }) {
  return (
    <FinderWindow title="Beats" onClose={onBack} onBack={onBack}>
      <div className="beats-view">
        <div className="latest-release">
          <h3 className="release-label">Ultimo lanzamiento</h3>
          <div className="yt-embed">
            <iframe
              src="https://www.youtube.com/embed/tMkv0ga4C1I"
              title="Ultimo lanzamiento Ktr3"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: "none", width: "100%", height: "100%" }}
            />
          </div>
          <p className="release-title">Ultimo lanzamiento</p>
          <p className="release-sub">Producido por Ktr3</p>
        </div>

        <h2>{BEATS_CONTENT.title}</h2>
        <p className="beats-desc">{BEATS_CONTENT.description}</p>
        <div className="beat-player">
          <iframe
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={BEATS_CONTENT.soundcloudEmbed}
            style={{ border: "none" }}
          />
        </div>
        <div className="beats-cta">
          <a href="https://www.beatstars.com/ktr3" target="_blank" rel="noopener noreferrer" className="app-store-btn">
            Comprar beats
          </a>
          <a href="https://soundcloud.com/ktr3" target="_blank" rel="noopener noreferrer" className="app-store-btn secondary">
            SoundCloud
          </a>
        </div>
      </div>
    </FinderWindow>
  );
}

function ProjectsView({ onBack, onSelectProject }) {
  return (
    <FinderWindow title="Proyectos" onClose={onBack} onBack={onBack}>
      <div className="folder-grid inside-finder">
        {PROJECTS.map((project) => (
          <button key={project.id} className="folder-item app-item" onClick={() => onSelectProject(project)}>
            <div className="folder-icon-wrap app-icon-wrap">
              <span className="folder-emoji">{project.icon}</span>
            </div>
            <span className="folder-label">{project.name}</span>
          </button>
        ))}
      </div>
    </FinderWindow>
  );
}

function AboutView({ onBack }) {
  return (
    <FinderWindow title="Sobre Ktr3" onClose={onBack} onBack={onBack}>
      <div className="about-view">
        <div className="about-header">
          <img src="/logo.png" alt="Ktr3" className="about-avatar" />
          <div>
            <h2>Ktr3</h2>
            <p className="about-role">Productor Musical</p>
          </div>
        </div>
        <p className="about-bio">{ABOUT_CONTENT.bio}</p>
        <div className="about-section">
          <h3>Estilos</h3>
          <div className="about-tags">
            {ABOUT_CONTENT.skills.map((s) => <span key={s} className="about-tag">{s}</span>)}
          </div>
        </div>
        <div className="about-section">
          <h3>Tools</h3>
          <div className="about-tags">
            {ABOUT_CONTENT.tools.map((t) => <span key={t} className="about-tag">{t}</span>)}
          </div>
        </div>
      </div>
    </FinderWindow>
  );
}

function ContactView({ onBack }) {
  return (
    <FinderWindow title="Contacto" onClose={onBack} onBack={onBack}>
      <div className="contact-view">
        <h2>Contacto & Colaboraciones</h2>
        <p>Para beats custom, colaboraciones o consultas:</p>
        <a href="mailto:prod.ktr3@gmail.com" className="contact-email">prod.ktr3@gmail.com</a>
        <p className="contact-note">DM por Instagram tambien funciona</p>
        <a href="https://www.instagram.com/ktr3ss/" target="_blank" rel="noopener noreferrer" className="app-store-btn secondary">
          @ktr3ss en Instagram
        </a>
      </div>
    </FinderWindow>
  );
}

/* ═══════════════════════════════════════════
   INTERACTIVE TERMINAL
   ═══════════════════════════════════════════ */

function InteractiveTerminal({ onNavigate }) {
  const [history, setHistory] = useState([{ type: "output", lines: ["Bienvenido a Ktr3OS. Escribe 'help' para ver comandos."] }]);
  const [input, setInput] = useState("");
  const [matrixActive, setMatrixActive] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;

    const newHistory = [...history, { type: "input", text: cmd }];

    if (cmd === "clear") {
      setHistory([]);
      setInput("");
      return;
    }

    const handler = TERMINAL_COMMANDS[cmd] || TERMINAL_COMMANDS[cmd.split(" ")[0]];
    if (handler) {
      const result = cmd === "echo" ? handler(input.trim().slice(5)) : handler();
      const lines = [];
      for (const line of result) {
        if (line === "__ACTION__:matrix") {
          setMatrixActive(true);
          setTimeout(() => setMatrixActive(false), 4000);
          lines.push("Entering the Matrix...");
        } else if (line.startsWith("__ACTION__:url:")) {
          window.open(line.slice(15), "_blank");
        } else if (line.startsWith("__ACTION__:nav:")) {
          setTimeout(() => onNavigate(line.slice(15)), 300);
        } else {
          lines.push(line);
        }
      }
      newHistory.push({ type: "output", lines });
    } else {
      newHistory.push({ type: "output", lines: [`ktr3OS: comando no encontrado: ${cmd}`, "Escribe 'help' para ver comandos disponibles."] });
    }

    setHistory(newHistory);
    setInput("");
  };

  return (
    <>
      {matrixActive && <MatrixRain />}
      <div className="interactive-terminal" onClick={() => inputRef.current?.focus()}>
        <div className="terminal-history" ref={scrollRef}>
          {history.map((entry, i) =>
            entry.type === "input" ? (
              <div key={i} className="term-line">
                <span className="term-prompt">ktr3@ktr3OS:~$</span> {entry.text}
              </div>
            ) : (
              <div key={i} className="term-output">
                {entry.lines.map((line, j) => <div key={j}>{line}</div>)}
              </div>
            )
          )}
        </div>
        <form onSubmit={handleSubmit} className="term-input-row">
          <span className="term-prompt">ktr3@ktr3OS:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="term-input"
            spellCheck="false"
            autoComplete="off"
          />
        </form>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   MATRIX RAIN (easter egg)
   ═══════════════════════════════════════════ */

function MatrixRain() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cols = Math.floor(canvas.width / 16);
    const drops = Array(cols).fill(0);
    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789KTR3";

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#a855f7";
      ctx.font = "14px monospace";

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * 16, drops[i] * 16);
        if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return <canvas ref={canvasRef} className="matrix-canvas" />;
}

/* ═══════════════════════════════════════════
   NOTIFICATION
   ═══════════════════════════════════════════ */

function Notification({ onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="notification" onClick={onClose}>
      <div className="notif-header">
        <span className="notif-app">Ktr3OS</span>
        <span className="notif-time">ahora</span>
      </div>
      <div className="notif-body">
        <strong>Nuevo lanzamiento</strong>
        <p>Nuevo videoclip ya disponible</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RIGHT-CLICK CONTEXT MENU
   ═══════════════════════════════════════════ */

function ContextMenu({ x, y, onClose, onAction }) {
  const items = [
    { label: "Sobre Ktr3OS", icon: "ℹ️", action: "about-os" },
    { divider: true },
    { label: "Abrir Beats", icon: "🎵", action: "beats" },
    { label: "Abrir Proyectos", icon: "🚀", action: "proyectos" },
    { label: "Underground GZK", icon: "🌐", action: "underground" },
    { label: "Contacto", icon: "📬", action: "contacto" },
    { divider: true },
    { label: "Ultimo lanzamiento", icon: "🎬", action: "play" },
    { label: "Comprar beats", icon: "🛒", action: "buy" },
  ];

  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [onClose]);

  return (
    <div className="context-menu" style={{ top: y, left: x }} onClick={(e) => e.stopPropagation()}>
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="ctx-divider" />
        ) : (
          <button key={i} className="ctx-item" onClick={() => { onAction(item.action); onClose(); }}>
            <span className="ctx-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABOUT OS MODAL
   ═══════════════════════════════════════════ */

function AboutOSModal({ onClose }) {
  return (
    <div className="spotlight-overlay" onClick={onClose}>
      <div className="about-os-modal" onClick={(e) => e.stopPropagation()}>
        <img src="/logo.png" alt="K3" className="about-os-logo" />
        <h2>Ktr3OS</h2>
        <p className="about-os-version">Version 2.0</p>
        <p className="about-os-sub">Productor Musical &middot; Beatmaker</p>
        <p className="about-os-copy">&copy; 2026 Ktr3. Todos los derechos reservados.</p>
        <button className="app-store-btn" onClick={onClose} style={{ marginTop: 16 }}>Cerrar</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LIVE CLOCK
   ═══════════════════════════════════════════ */

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }) +
        "  " +
        now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
      );
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);

  return <span className="menubar-item">{time}</span>;
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */

export default function Home() {
  const [booted, setBooted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dockReady, setDockReady] = useState(false);
  const [currentView, setCurrentView] = useState("desktop");
  const [selectedProject, setSelectedProject] = useState(null);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [showAboutOS, setShowAboutOS] = useState(false);

  // Boot sequence
  const handleBootComplete = useCallback(() => {
    setBooted(true);
    setTimeout(() => setMounted(true), 100);
    setTimeout(() => setDockReady(true), 400);
    setTimeout(() => setShowNotif(true), 5000);
  }, []);

  // Cmd+K spotlight
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSpotlight((s) => !s);
      }
      if (e.key === "Escape") { setShowSpotlight(false); setShowAboutOS(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Right-click
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({ x: Math.min(e.clientX, window.innerWidth - 220), y: Math.min(e.clientY, window.innerHeight - 300) });
  }, []);

  const handleContextAction = useCallback((action) => {
    switch (action) {
      case "about-os": setShowAboutOS(true); break;
      case "beats": navigate("beats"); break;
      case "proyectos": navigate("proyectos"); break;
      case "underground": window.location.href = "/underground"; break;
      case "contacto": navigate("contacto"); break;
      case "play": window.open("https://www.youtube.com/watch?v=tMkv0ga4C1I", "_blank"); break;
      case "buy": window.open("https://www.beatstars.com/ktr3", "_blank"); break;
    }
  }, []);

  const goDesktop = () => {
    setCurrentView("desktop");
    setSelectedProject(null);
  };

  const navigate = (view) => {
    setSelectedProject(null);
    setCurrentView(view);
  };

  const renderView = () => {
    if (selectedProject) {
      return <ProjectDetail project={selectedProject} onBack={() => setSelectedProject(null)} />;
    }
    switch (currentView) {
      case "beats": return <BeatsView onBack={goDesktop} />;
      case "proyectos": return <ProjectsView onBack={goDesktop} onSelectProject={setSelectedProject} />;
      case "sobre-mi": return <AboutView onBack={goDesktop} />;
      case "contacto": return <ContactView onBack={goDesktop} />;
      default: return null;
    }
  };

  if (!booted) {
    return <BootScreen onComplete={handleBootComplete} />;
  }

  return (
    <main className={`desktop ${mounted ? "mounted" : ""}`} onContextMenu={handleContextMenu}>
      <div className="wallpaper" />
      <Particles />

      {/* Notification */}
      {showNotif && <Notification onClose={() => setShowNotif(false)} />}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} onAction={handleContextAction} />
      )}

      {/* About OS modal */}
      {showAboutOS && <AboutOSModal onClose={() => setShowAboutOS(false)} />}

      {/* Menu bar */}
      <div className="menubar">
        <div className="menubar-left">
          <span className="menubar-logo" onClick={goDesktop}>K3</span>
          <span className="menubar-item">Ktr3OS</span>
          <button className="menubar-search" onClick={() => setShowSpotlight(true)} title="Buscar (Cmd+K)">
            &#128269; Buscar
          </button>
        </div>
        <div className="menubar-right">
          <LiveClock />
        </div>
      </div>

      {/* Spotlight */}
      {showSpotlight && (
        <Spotlight onClose={() => setShowSpotlight(false)} onNavigate={navigate} />
      )}

      {/* Interactive Terminal */}
      <InteractiveTerminal onNavigate={navigate} />

      {/* Audio visualizer */}
      <div className="visualizer-wrap">
        <AudioVisualizer />
      </div>

      {/* Profile */}
      <section className="profile-section">
        <div className="profile-text">
          <p className="profile-prefix">&gt; Hola, soy</p>
          <h1 className="profile-name">Ktr3</h1>
          <p className="profile-tagline">productor musical & beatmaker</p>
        </div>
        <div className="profile-avatar-wrap">
          <img src="/logo.png" alt="Ktr3" className="profile-avatar" />
        </div>
      </section>

      {/* Desktop or open window */}
      {currentView === "desktop" ? (
        <section className="desktop-folders">
          <div className="folder-grid">
            {FOLDERS.map((folder, i) => (
              <button
                key={folder.id}
                className={`folder-item folder-stagger folder-stagger-${i}`}
                onClick={() => {
                  if (folder.href) {
                    window.location.href = folder.href;
                    return;
                  }
                  setCurrentView(folder.id);
                }}
              >
                <div className="folder-icon-wrap">
                  <svg className="folder-svg" viewBox="0 0 80 60" fill="none">
                    <path d="M2 14C2 10.686 4.686 8 8 8H28L34 2H72C75.314 2 78 4.686 78 8V52C78 55.314 75.314 58 72 58H8C4.686 58 2 55.314 2 52V14Z" fill="url(#folderGrad)" />
                    <defs>
                      <linearGradient id="folderGrad" x1="40" y1="0" x2="40" y2="60" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#c084fc" />
                        <stop offset="1" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="folder-emoji">{folder.icon}</span>
                </div>
                <span className="folder-label">{folder.label}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="window-section">
          {renderView()}
        </section>
      )}

      <Dock dockReady={dockReady} />
    </main>
  );
}
