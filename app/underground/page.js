"use client";

import { useMemo, useState } from "react";
import { useFairRadio } from "../../hooks/useFairRadio";
import { useUndergroundCatalog } from "../../hooks/useUndergroundCatalog";
import { spotifyEmbedType, spotifyEmbedUrl, spotifyUri } from "../../lib/underground/spotify";
import { isRadioEligibleProfile } from "../../lib/underground/profile-schema";
import {
  listenDestination,
  spotifyListeningUrl,
} from "../../lib/underground/listening";
import styles from "./Underground.module.css";
import SoundCloudRadioPlayer from "./SoundCloudRadioPlayer";
import SpotifyRadioPlayer from "./SpotifyRadioPlayer";

const ROLE_META = {
  artist: { label: "Artistas", short: "Artista", color: "green" },
  producer: { label: "Productores", short: "Productor", color: "pink" },
  collective: { label: "Colectivos / Sellos", short: "Colectivo", color: "blue" },
  visual: { label: "Foto / Visual", short: "Visual", color: "violet" },
  dj: { label: "DJ", short: "DJ", color: "orange" },
};

const PEOPLE = [
  { name: "AIGORY", roles: ["artist"] },
  { name: "Miguel Matador", roles: ["visual"], instagram: "miguel_matador" },
  { name: "ØDEI", roles: ["artist"], instagram: "odei_alkimia" },
  { name: "Amilibia DJ", roles: ["dj"] },
  { name: "Aimarz", roles: ["artist"], spotify: "https://open.spotify.com/artist/7IRVn9V0N33Wycvq07590f" },
  { name: "Blind 09", roles: ["artist"] },
  { name: "heiss.sdl", roles: ["producer"], instagram: "heiss.sdl" },
  { name: "Blueice Davies", roles: ["artist"], spotify: "https://open.spotify.com/artist/5YHIAElil2pUlmx5RL0GXb" },
  { name: "Chef Drez", roles: ["producer"], instagram: "chefdrez" },
  { name: "DDX", roles: ["collective"], instagram: "ddx.music" },
  { name: "Dlaheyzz", roles: ["artist"], instagram: "dlaheyzz" },
  { name: "Denso", roles: ["producer"], instagram: "denso.prod" },
  { name: "Devil Records", roles: ["collective"] },
  { name: "ELC 310", roles: ["collective"], instagram: "elc_310" },
  { name: "El Garto", roles: ["artist"] },
  { name: "El Negro EH", roles: ["artist"], instagram: "elnegro_eh" },
  { name: "SDL", roles: ["collective"] },
  { name: "Esencia TP", roles: ["collective"], instagram: "esencia_tp" },
  { name: "Etxeba013", roles: ["artist"], instagram: "etxeba013", spotify: "https://open.spotify.com/artist/4JkxQgg2t9HL327atkXRS5", spotifyTrack: "https://open.spotify.com/track/3m1nhWWqUZF2Ur5OJsCRE5" },
  { name: "fezzy_jay", roles: ["producer"], instagram: "fezzy_jay" },
  { name: "Frank Juncho", roles: ["producer"], instagram: "frankhuncho__" },
  { name: "prodhrd", roles: ["producer"] },
  { name: "HSTLRS", roles: ["collective"], instagram: "hstlr.recordss" },
  { name: "Ibaiz8", roles: ["producer"], instagram: "ibaiz8", spotify: "https://open.spotify.com/artist/2zwur2cZusogieRGsRtF59" },
  { name: "J Muñoz", roles: ["artist"], spotify: "https://open.spotify.com/artist/7M3HiEmiFoeukUI2KiO42p", spotifyTrack: "https://open.spotify.com/track/5qJNVsjG3lgXCNdyLjEPCi" },
  { name: "J. Largo", roles: ["artist"], spotify: "https://open.spotify.com/artist/7zFHMJ0aGmpBSxEBxT08gI" },
  { name: "J13", roles: ["artist"], instagram: "bigggg_j13" },
  { name: "Janda", roles: ["artist"] },
  { name: "Juicyfr", roles: ["artist"], instagram: "juicy4real_" },
  { name: "LS", roles: ["artist"], instagram: "konnaytheface" },
  { name: "KTR3", roles: ["producer"], instagram: "ktr3ss", spotify: "https://open.spotify.com/artist/1aQ6zZfkgg982Uzi431Y6R", spotifyTrack: "https://open.spotify.com/track/0I6qFBg4xjHP44yScjUZts" },
  { name: "Kyubid", roles: ["artist"], instagram: "kyubiddd", spotify: "https://open.spotify.com/artist/3X32334eMCaT6gxwdgQ4LM", spotifyTrack: "https://open.spotify.com/track/612OACrhUVnIQRFQ21pW40" },
  { name: "unidentifiedminds", roles: ["collective"], instagram: "unidentifiedminds" },
  { name: "LaTriku", roles: ["artist"], instagram: "trulygottit" },
  { name: "Lawless Records", roles: ["collective"], instagram: "lawless_records_", spotify: "https://open.spotify.com/artist/7fEXFjhn8eaiEtKnsX9sCO" },
  { name: "Low_fi_pics", roles: ["visual"], instagram: "low_fi_pics" },
  { name: "AMETZA KLAN", roles: ["collective"], instagram: "ametza_klan" },
  { name: "Bojaman Style", roles: ["artist"], instagram: "bojaman_style", spotify: "https://open.spotify.com/artist/0x9r7JXyMPJhOLWkqibxPm" },
  { name: "JAKO 20ocho", roles: ["artist"], instagram: "20ochoproducciones" },
  { name: "Mr Luken", roles: ["artist"], instagram: "mr.lukeen" },
  { name: "BIG ALIK", roles: ["producer"], instagram: "el_gran_alik" },
  { name: "mf.hako", roles: ["artist"], instagram: "mf.hako" },
  { name: "Mud Records", roles: ["collective"], instagram: "mud.records", spotify: "https://open.spotify.com/artist/6QLDUxoF3gIGb7YAlhmkNu" },
  { name: "Munflow", roles: ["artist"] },
  { name: "Munizz", roles: ["artist"], instagram: "muni.zz", spotify: "https://open.spotify.com/artist/5eh31djcKuhVAJOWmRgoXr" },
  { name: "Mutiko", roles: ["artist"], instagram: "mutiko__", spotify: "https://open.spotify.com/artist/781vFifow809ZOrtzVCCkH" },
  { name: "Nasser.films", roles: ["visual"], instagram: "nasser.films" },
  { name: "OG_GS", roles: ["producer"] },
  { name: "Oihane", roles: ["artist"], instagram: "oihaneulanga", spotifyTrack: "https://open.spotify.com/track/0I6qFBg4xjHP44yScjUZts" },
  { name: "Sensi Beats", roles: ["producer"] },
  { name: "SNKT", roles: ["collective"] },
  { name: "Deco7", roles: ["artist"], instagram: "deco7_sr" },
  { name: "Che Gabbana", roles: ["artist"], spotify: "https://open.spotify.com/artist/2wte2oYgiyRnCDcBsrq8md" },
  { name: "elfideodimaria", roles: ["artist"], spotify: "https://open.spotify.com/artist/42OC3Kxwfs3FyREqNYdgNy" },
  { name: "Suprim Records", roles: ["collective"], instagram: "suprimrecords" },
  { name: "Tatta", roles: ["artist"], instagram: "tatta.me" },
  { name: "lil48280", roles: ["artist"], instagram: "lil48280" },
  { name: "Trydeal", roles: ["artist"], instagram: "traydeal_" },
  { name: "TXUSO", roles: ["producer"], instagram: "txusoprod" },
  { name: "Watsu", roles: ["producer"] },
  { name: "Ataide", roles: ["producer"] },
  { name: "pinkflamingo", roles: ["producer"], instagram: "pinkflamingo.prod" },
  { name: "svet.studiio", roles: ["visual"], instagram: "svet.studiio" },
  { name: "Yasser", roles: ["artist"] },
  { name: "HODI mg", roles: ["artist"], spotify: "https://open.spotify.com/artist/0CNQvIFjD5TzoJ8P3qjzeA", spotifyTrack: "https://open.spotify.com/track/7z4ozCxACWU7nWrScmH7jp" },
  { name: "Jhota", roles: ["artist"], instagram: "jhotaxx_" },
  { name: "Kid Icaro", roles: ["artist"] },
  { name: "Zilibito Records", roles: ["collective"] },
  { name: "moody.240", roles: ["artist"], instagram: "moody.240", spotify: "https://open.spotify.com/artist/3cjLwHjlkFKxsfDLUlHBvN", spotifyTrack: "https://open.spotify.com/track/3lgLqRFEGLlyUSFhRudW0o" },
  { name: "sanaguidelacity", roles: ["artist"], instagram: "sanaguidelacity" },
  { name: "medallo47", roles: ["artist"] },
  { name: "Jezyel", roles: ["artist"], instagram: "jezyel", spotify: "https://open.spotify.com/artist/3tynCXWoMOLGnVcxfF5vXj", spotifyTrack: "https://open.spotify.com/track/4wNjtxowrRz7EHghGqiQmv" },
  { name: "Danel", roles: ["artist"], spotifyTrack: "https://open.spotify.com/track/4BxvAchKL6DQW5j8GfXSDT" },
  { name: "georgepalmer", roles: ["artist"] },
  { name: "louky", roles: ["artist"], instagram: "louky.wav", spotify: "https://open.spotify.com/artist/5moi3NTcqtPWGEFcQQLKQ0" },
  { name: "CSK013", roles: ["dj"] },
  { name: "ADUR DR", roles: ["artist"], spotify: "https://open.spotify.com/artist/4MC71aPfccU0SH9jfy0Wy3" },
  { name: "FRAME", roles: ["artist"] },
  { name: "herdest", roles: ["artist"] },
  { name: "xrtzy", roles: ["artist"], spotify: "https://open.spotify.com/artist/3iGQgZ0MfJEi3o8XSQhEW6", spotifyTrack: "https://open.spotify.com/track/6vc0qq2R0RO42hqnNjcFhR" },
  { name: "KIOW", roles: ["artist"], spotify: "https://open.spotify.com/artist/155R2ZAoHCveMXnAzlYbFr" },
  { name: "K-rras", roles: ["artist"], instagram: "karrasier" },
  { name: "kr8beatz", roles: ["producer"], instagram: "kr8beatz" },
  { name: "x33", roles: ["collective"] },
  { name: "Northern Black Sheeps NBS", roles: ["collective"], instagram: "nbs_20140" },
  { name: "TROTI", roles: ["dj"], instagram: "rialtroti" },
  { name: "UNOTRES MOBB", roles: ["collective"] },
];

function profileKey(profile) {
  return profile.id || profile.name;
}

function playUiSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.11);
    setTimeout(() => ctx.close(), 180);
  } catch {
    // Audio feedback is optional.
  }
}

export default function UndergroundPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [selected, setSelected] = useState(null);
  const { profiles: people } = useUndergroundCatalog(PEOPLE);
  const radioPool = useMemo(
    () => people.filter(isRadioEligibleProfile),
    [people]
  );
  const featuredRadioId = useMemo(() => {
    const creator = radioPool.find((person) => person.name.toLocaleUpperCase("es") === "KTR3");
    return creator ? profileKey(creator) : null;
  }, [radioPool]);
  const {
    currentProfile: radioArtist,
    isFeatured: radioIsFeatured,
    next: nextRadioArtist,
    position: radioPosition,
    total: radioTotal,
    cycle: radioCycle,
  } = useFairRadio(radioPool, { getKey: profileKey, featuredId: featuredRadioId });

  const pickRandomRadioArtist = () => {
    nextRadioArtist();
    playUiSound();
  };

  const counts = useMemo(() => {
    return Object.keys(ROLE_META).reduce((acc, key) => {
      acc[key] = people.filter((person) => person.roles.includes(key)).length;
      return acc;
    }, { all: people.length });
  }, [people]);

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return people.filter((person) => {
      const roleMatch = role === "all" || person.roles.includes(role);
      const queryMatch = !clean || person.name.toLowerCase().includes(clean) || person.instagram?.toLowerCase().includes(clean);
      return roleMatch && queryMatch;
    });
  }, [people, query, role]);

  const grouped = useMemo(() => {
    return Object.keys(ROLE_META).reduce((acc, key) => {
      acc[key] = filtered.filter((person) => person.roles.includes(key));
      return acc;
    }, {});
  }, [filtered]);

  const openPerson = (person) => {
    setSelected(person);
    playUiSound();
  };

  const resetFilters = () => {
    setQuery("");
    setRole("all");
  };

  const selectedSpotifyUrl = spotifyListeningUrl(selected);
  const radioSpotifyUrl = spotifyListeningUrl(radioArtist);
  const selectedDestination = listenDestination(selected);
  const radioDestination = listenDestination(radioArtist);
  const selectedSoundCloudUrl = selectedDestination?.platform === "soundcloud" ? selectedDestination.url : null;
  const radioSoundCloudUrl = radioDestination?.platform === "soundcloud" ? radioDestination.url : null;
  const selectedSpotifyEmbed = spotifyEmbedUrl(selectedSpotifyUrl);
  const radioSpotifyEmbed = spotifyEmbedUrl(radioSpotifyUrl);
  const radioSpotifyUri = spotifyUri(radioSpotifyUrl);
  const selectedSpotifyType = spotifyEmbedType(selectedSpotifyUrl);
  const radioSpotifyType = spotifyEmbedType(radioSpotifyUrl);

  return (
    <main className={`underground-page ${styles.refactorRoot}`}>
      <section className="ug-poster-shell">
        <div className="ug-browser">
          <div className="ug-browser-buttons">
            <a href="/" className="ug-nav-btn" aria-label="Volver">←</a>
            <button className="ug-nav-btn" type="button" onClick={resetFilters} aria-label="Resetear">↻</button>
            <a href="/" className="ug-nav-btn" aria-label="Inicio">⌂</a>
          </div>
          <div className="ug-address">http://ktr3.es/underground</div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="ug-search-input"
            placeholder="escena underground gipuzkoa"
            aria-label="Buscar en la escena underground de Gipuzkoa"
          />
          <span className="ug-search-btn">SEARCH</span>
        </div>

        <div className="ug-poster">
          <div className="ug-aqua-landscape" aria-hidden="true">
            <i className="ug-aqua-orb ug-aqua-orb-one" />
            <i className="ug-aqua-orb ug-aqua-orb-two" />
            <i className="ug-aqua-orb ug-aqua-orb-three" />
            <span className="ug-aqua-hill ug-aqua-hill-left" />
            <span className="ug-aqua-hill ug-aqua-hill-right" />
            <span className="ug-aqua-water" />
          </div>
          <div className="ug-ambient-glints" aria-hidden="true">
            <i className="ug-glint-field ug-glint-field-a" />
            <i className="ug-glint-field ug-glint-field-b" />
            <i className="ug-glint-field ug-glint-field-c" />
            <i className="ug-glint-field ug-glint-field-d" />
          </div>
          <WebcoreDesktop />
          <div className="ug-sticker ug-sticker-left">
            <strong>100%</strong>
            <span>independiente</span>
          </div>
          <div className="ug-sticker ug-sticker-right">REAL MUSIC<br />REAL PEOPLE</div>
          <div className="ug-tape ug-tape-left">SUPPORT LOCAL</div>
          <div className="ug-tape ug-tape-right">DIY SIEMPRE</div>
          <div className="ug-y2k ug-cd" aria-hidden="true" />
          <div className="ug-y2k ug-mp3" aria-hidden="true">
            <span>GZK-003</span>
            <i />
          </div>
          <div className="ug-y2k ug-player" aria-hidden="true">
            <b>NOW PLAYING</b>
            <span>GIPUZKOA</span>
            <i />
          </div>
          <div className="ug-y2k ug-badge-gzk" aria-hidden="true">GZK</div>
          <div className="ug-marquee" aria-hidden="true">
            <span>*** GIPUZKOA UNDERGROUND ONLINE *** SUPPORT LOCAL *** KULTURA KONEKTA SORTU PARTEKATU ***</span>
          </div>
          <div className="ug-ascii-window" aria-hidden="true">
            <div className="ug-xp-title"><span>gzk-notepad.txt</span><i>_ □ ×</i></div>
            <pre>{`   __  __
  / _|/ _|
 | |_| |_
 |  _|  _|
 |_| |_|   GZK
 conectando escena...`}</pre>
          </div>
          <div className="ug-visitor-counter" aria-hidden="true">
            <span>VISITAS</span><b>000087</b>
          </div>
          <div className="ug-guestbook" aria-hidden="true">FIRMA EL GUESTBOOK</div>
          <div className="ug-sticker-wall" aria-hidden="true">
            <span className="s1">★</span>
            <span className="s2">♥</span>
            <span className="s3">☻</span>
            <span className="s4">✦</span>
            <span className="s5">MP3</span>
            <span className="s6">.GZK</span>
          </div>
          <div className="ug-gif ug-gif-eq" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="ug-gif ug-gif-sparkle" aria-hidden="true">✧</div>
          <div className="ug-gif ug-gif-mail" aria-hidden="true">✉</div>
          <div className="ug-geocities ug-under-construction" aria-hidden="true">
            <b>UNDER</b><span>CONSTRUCTION</span>
          </div>
          <div className="ug-geocities ug-best-viewed" aria-hidden="true">
            BEST VIEWED<br />800×600<br />NETSCAPE READY
          </div>
          <div className="ug-geocities ug-webring" aria-hidden="true">
            <button>← PREV</button><strong>GZK WEBRING</strong><button>NEXT →</button>
          </div>
          <div className="ug-geocities ug-link-farm" aria-hidden="true">
            <p>cool links</p>
            <span>beats.html</span>
            <span>mp3_zone</span>
            <span>guestbook</span>
          </div>
          <div className="ug-geocities ug-rainbow-line" aria-hidden="true" />

          <section className="ug-spotify-radio" aria-label="GZK Radio aleatoria Spotify y SoundCloud">
            <div className="ug-xp-title"><span>gzk-radio.exe</span><i>_ □ ×</i></div>
            <div className="ug-radio-body">
              <div className="ug-radio-screen">
                <span className={radioIsFeatured ? "ug-radio-featured" : ""}>
                  {radioIsFeatured ? "K3 CREATOR START" : `${radioDestination?.platform === "soundcloud" ? "SOUNDCLOUD" : "SPOTIFY"} RANDOM`}
                </span>
                <strong>{radioArtist?.name || "cargando..."}</strong>
                <em>{radioDestination ? `${radioDestination.platform} conectado` : "sin enlace reproducible"}</em>
                <small className="ug-radio-cycle">VUELTA {radioCycle} · {radioPosition}/{radioTotal}</small>
              </div>
              {radioSpotifyUri ? (
                <SpotifyRadioPlayer
                  uri={radioSpotifyUri}
                  embedUrl={radioSpotifyEmbed}
                  type={radioSpotifyType}
                  title={radioArtist?.name || "GZK Radio"}
                />
              ) : radioSoundCloudUrl ? (
                <SoundCloudRadioPlayer
                  url={radioSoundCloudUrl}
                  title={radioArtist?.name || "GZK Radio"}
                />
              ) : (
                <div className="ug-radio-fake">
                  <div className="ug-radio-disc" />
                  <div className="ug-radio-bars"><i /><i /><i /><i /><i /><i /></div>
                </div>
              )}
              <div className="ug-radio-controls">
                {radioDestination ? (
                  <a
                    className={`ug-listen-${radioDestination.platform}`}
                    href={radioDestination.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    abrir {radioDestination.platform === "apple_music" ? "apple music" : radioDestination.platform}
                  </a>
                ) : <span className="ug-radio-no-link">sin enlace</span>}
                <button type="button" onClick={pickRandomRadioArtist}>random</button>
              </div>
            </div>
          </section>
          <div className="ug-aero ug-aero-mixer" aria-hidden="true">
            <div className="ug-aero-title">Volume Control</div>
            <span /><span /><span /><span />
          </div>
          <div className="ug-aero ug-download" aria-hidden="true">
            <b>downloading_scene.zip</b>
            <i />
          </div>
          <div className="ug-aero ug-system-popup" aria-hidden="true">
            <b>GZK Update</b>
            <span>new names detected</span>
          </div>
          <div className="ug-xp-taskbar" aria-hidden="true">
            <b>start</b>
            <span>gzk-radio.exe</span>
            <span>underground.html</span>
            <i>23:59</i>
          </div>
          <div className="ug-chaos ug-msn" aria-hidden="true">
            <div className="ug-xp-title"><span>MSN Messenger</span><i>_ □ ×</i></div>
            <p><b>gzk_scene</b> está online</p>
            <span>konektatu por la kultura</span>
          </div>
          <div className="ug-chaos ug-error" aria-hidden="true">
            <div className="ug-xp-title"><span>scene_alert.dll</span><i>×</i></div>
            <p>support local?</p>
            <b>YES</b>
          </div>
          <div className="ug-chaos ug-aero-orb" aria-hidden="true">♪</div>
          <div className="ug-chaos ug-dvd" aria-hidden="true">DVD<br />GZK</div>
          <div className="ug-chaos ug-midi" aria-hidden="true">
            <b>MIDI DEVICE</b>
            <i /><i /><i />
          </div>
          <div className="ug-chaos ug-flame-strip" aria-hidden="true">
            <span>GZK</span><span>GZK</span><span>GZK</span><span>GZK</span>
          </div>
          <div className="ug-chaos ug-pixel-badges" aria-hidden="true">
            <span>NO AI JUST SCENE</span>
            <span>MP3 READY</span>
            <span>LOCAL FIRST</span>
            <span>XP MODE</span>
          </div>
          <div className="ug-chaos ug-starfield" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
          </div>
          <div className="ug-cw-layer" aria-hidden="true">
            <div className="ug-cw-badges">
              <span>GZK NET</span>
              <span>MP3 ZONE</span>
              <span>NO TEMPLATE</span>
              <span>LOCAL WEB</span>
              <span>REAL AUDIO</span>
              <span>HTML 4 LIFE</span>
            </div>
            <div className="ug-cw-window ug-cw-news">
              <div className="ug-cw-titlebar">gzk_news.htm</div>
              <p>updated 07/07/2026</p>
              <b>escena en obras</b>
              <span>nuevos links detectados...</span>
            </div>
            <div className="ug-cw-window ug-cw-mailbox">
              <div className="ug-cw-titlebar">webmaster.mail</div>
              <p>send demos</p>
              <b>hola@gzk.local</b>
            </div>
            <div className="ug-cw-window ug-cw-downloads">
              <div className="ug-cw-titlebar">download manager</div>
              <p>gipuzkoa_scene_pack.zip</p>
              <i /><i /><i />
            </div>
            <div className="ug-cw-window ug-cw-choice">
              <div className="ug-cw-titlebar">choose browser</div>
              <span>enter with IE5</span>
              <span>enter with Netscape</span>
            </div>
            <div className="ug-cw-window ug-cw-poll">
              <div className="ug-cw-titlebar">quick poll</div>
              <p>support local?</p>
              <b>YES 99%</b>
            </div>
            <div className="ug-cw-join">JOIN THE<br />GZK WEBRING</div>
            <div className="ug-cw-counter"><span>you are visitor</span><b>000087</b></div>
            <div className="ug-cw-ruler"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="ug-cw-cursor">CLICK<br />ARTISTS</div>
            <div className="ug-cw-sparkles">
              <i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
            </div>
          </div>
          <div className="ug-lounge-layer" aria-hidden="true">
            <div className="ug-lounge-panel ug-lounge-online">
              <h3>WHO'S ONLINE</h3>
              <b>87 users online</b>
              <span>artists: 48</span>
              <span>diggers: 39</span>
            </div>
            <div className="ug-lounge-panel ug-lounge-profile">
              <h3>MY PROFILE</h3>
              <b>guest_gzk</b>
              <span>balance: 48280 pts</span>
              <i>claim daily bonus</i>
            </div>
            <div className="ug-lounge-panel ug-lounge-achievements">
              <h3>ACHIEVEMENTS</h3>
              <span>local scene unlocked</span>
              <span>support streak x7</span>
              <span>radio randomizer</span>
            </div>
            <div className="ug-lounge-chat">
              <div className="ug-lounge-topic">#gzk_lounge (87) · topic: kultura konekta sortu</div>
              <p><b>guest_gzk:</b> nor ari da soinua egiten?</p>
              <p><b>radio_bot:</b> random artist loaded...</p>
              <p><b>webmaster:</b> click names for links</p>
              <p><b>scene:</b> Gipuzkoa online</p>
              <em>press ENTER to send · be excellent</em>
            </div>
          </div>
          <div className="ug-archive-layer" aria-hidden="true">
            <div className="ug-crt-frame">
              <div className="ug-crt-static" />
              <div className="ug-archive-menu">
                <span>FORUM</span>
                <span>DVD</span>
                <span>SHOP</span>
                <span>ABOUT</span>
                <span>CONTACT</span>
              </div>
              <b>GZK ARCHIVE</b>
            </div>
            <div className="ug-archive-warning">
              <div className="ug-cw-titlebar">scene_warning.exe</div>
              <p>Esta pagina contiene ruido visual, cultura local y enlaces reales.</p>
              <span>OK</span>
            </div>
          </div>
          <div className="ug-websites-layer" aria-hidden="true">
            <div className="ug-web-topbar">
              <b>GZK</b>
              <span>WEBSITES</span>
              <i>511 links indexed</i>
            </div>
            <div className="ug-web-sidebar">
              <span className="active">websites</span>
              <span>history</span>
              <span>music</span>
              <span>interviews</span>
              <span>webring</span>
              <span>special posts</span>
            </div>
            <div className="ug-web-directory">
              <h3>DIRECTORIO.GZK</h3>
              <p>select up to 2 tags to filter the scene list:</p>
              <div className="ug-web-tags">
                <span className="active">all</span>
                <span>music</span>
                <span>old web</span>
                <span>archive</span>
                <span>forum</span>
                <span>local</span>
                <span>weird</span>
              </div>
              <button type="button">random link!</button>
              <div className="ug-web-table">
                <span>Name</span><span>Description</span>
                <b>GZK Scene</b><i>artist links, demos, visuals</i>
                <b>MP3 Zone</b><i>radio randomizer online</i>
                <b>Local Webring</b><i>support local pages</i>
              </div>
            </div>
            <div className="ug-web-player">
              <b>Giant Steps</b>
              <span>Interior (1982)</span>
              <i />
            </div>
          </div>

          <header className="ug-title-zone">
            <p className="ug-title-ikurrina" aria-label="GIPUZKOAKO">
              <b className="ug-title-red" aria-hidden="true">GIP</b><b className="ug-title-green" aria-hidden="true">UZKO</b><b className="ug-title-white" aria-hidden="true">AKO</b>
            </p>
            <h1>UNDERGROUND</h1>
            <span>Escena urbana de Gipuzkoa</span>
          </header>

          <nav className="ug-role-tabs" aria-label="Filtrar por rol">
            <button className={role === "all" ? "active" : ""} onClick={() => setRole("all")}>Todo {counts.all}</button>
            {Object.entries(ROLE_META).map(([key, meta]) => (
              <button key={key} className={role === key ? "active" : ""} onClick={() => setRole(key)}>
                {meta.short} {counts[key]}
              </button>
            ))}
          </nav>

          <div className="ug-board">
            <section className="ug-panel ug-panel-artists">
              <h2><span>1</span> Artistas</h2>
              <div className="ug-name-cloud">
                {grouped.artist.map((person) => <NameLink key={person.name} person={person} onSelect={openPerson} />)}
              </div>
            </section>

            <section className="ug-panel ug-panel-producers">
              <h2><span>2</span> Productores</h2>
              <div className="ug-name-cloud">
                {grouped.producer.map((person) => <NameLink key={person.name} person={person} onSelect={openPerson} />)}
              </div>
            </section>

            <section className="ug-panel ug-panel-collectives">
              <h2><span>3</span> Colectivos / Sellos</h2>
              <div className="ug-name-cloud">
                {grouped.collective.map((person) => <NameLink key={person.name} person={person} onSelect={openPerson} />)}
              </div>
            </section>

            <section className="ug-panel ug-panel-visual">
              <h2><span>4</span> Foto / Visual</h2>
              <div className="ug-name-cloud">
                {grouped.visual.map((person) => <NameLink key={person.name} person={person} onSelect={openPerson} />)}
              </div>
            </section>

            <section className="ug-panel ug-panel-dj">
              <h2><span>5</span> DJ</h2>
              <div className="ug-name-cloud">
                {grouped.dj.map((person) => <NameLink key={person.name} person={person} onSelect={openPerson} />)}
              </div>
            </section>

            <aside className="ug-summary">
              <h2>GZK</h2>
              {Object.entries(ROLE_META).map(([key, meta]) => (
                <button key={key} onClick={() => setRole(key)}>
                  <i className={meta.color} /> <span>{meta.label}</span> <strong>{counts[key]}</strong>
                </button>
              ))}
              <div><span>Total</span><strong>{counts.all}</strong></div>
            </aside>
          </div>

          <div className="ug-status">
            <span className="ug-status-message">KULTURA • KONEKTA • SORTU • PARTEKATU</span>
            <a className="ug-creator-credit" href="/" aria-label="K3, creador de GZK Underground">
              <img src="/favicon.png" width="28" height="28" alt="" aria-hidden="true" />
              <span>CREATED BY <strong>K3</strong></span>
            </a>
          </div>
        </div>
      </section>

      <section className="ug-archive-radio" aria-labelledby="ug-archive-radio-title">
        <div className="ug-archive-radio-titlebar">
          <span id="ug-archive-radio-title">ktr3_radio_archive.exe</span>
          <i aria-hidden="true">_ □ ×</i>
        </div>
        <div className="ug-archive-radio-body">
          <div className="ug-archive-radio-media">
            <a
              className="ug-archive-radio-poster"
              href="https://youtu.be/ZiaWoMIkOTs?t=20983"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir KTR3 Los Cantos en YouTube desde 5 horas, 49 minutos y 43 segundos"
            >
              <img
                src="https://i.ytimg.com/vi/ZiaWoMIkOTs/hqdefault.jpg"
                width="480"
                height="360"
                loading="lazy"
                alt=""
                aria-hidden="true"
              />
              <span className="ug-archive-radio-play" aria-hidden="true">▶</span>
              <strong>PLAY EN YOUTUBE</strong>
            </a>
          </div>
          <div className="ug-archive-radio-copy">
            <span>K3 PERSONAL ARCHIVE · LOS CANTOS</span>
            <h2>KTR3 Complete Radio Broadcast</h2>
            <dl>
              <div><dt>START</dt><dd>05:49:43</dd></div>
              <div><dt>SOURCE</dt><dd>YouTube</dd></div>
              <div><dt>STATUS</dt><dd>ONLINE</dd></div>
            </dl>
            <a
              href="https://youtu.be/ZiaWoMIkOTs?t=20983"
              target="_blank"
              rel="noopener noreferrer"
            >
              ABRIR EMISIÓN COMPLETA ↗
            </a>
          </div>
        </div>
      </section>

      {selected && (
        <div className="ug-popover" onClick={() => setSelected(null)}>
          <article className="ug-profile-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="ug-profile-close" onClick={() => setSelected(null)}>×</button>
            <p>NOW PLAYING</p>
            <h2>{selected.name}</h2>
            <div className="ug-profile-roles">
              {selected.roles.map((item) => <span key={item} className={ROLE_META[item].color}>{ROLE_META[item].short}</span>)}
            </div>
            {selectedSpotifyEmbed && (
              <iframe
                className={`ug-spotify-embed ug-spotify-embed-${selectedSpotifyType || "track"}`}
                src={selectedSpotifyEmbed}
                title={`Spotify: ${selected.name}`}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            )}
            {selectedSoundCloudUrl && (
              <SoundCloudRadioPlayer
                url={selectedSoundCloudUrl}
                title={selected.name}
                variant="profile"
              />
            )}
            <div className="ug-profile-actions">
              {selected.instagram && (
                <a href={`https://www.instagram.com/${selected.instagram}/`} target="_blank" rel="noopener noreferrer">Instagram</a>
              )}
              {[
                { platform: "spotify", url: selectedSpotifyUrl, label: "Spotify" },
                { platform: "soundcloud", url: selected.soundcloud, label: "SoundCloud" },
                { platform: "youtube", url: selected.youtube, label: "YouTube" },
                { platform: "bandcamp", url: selected.bandcamp, label: "Bandcamp" },
                { platform: "apple_music", url: selected.appleMusic, label: "Apple Music" },
                { platform: "website", url: selected.website, label: "Web" },
              ].filter((link) => link.url).map((link) => (
                <a
                  key={`${link.platform}-${link.url}`}
                  className={`ug-listen-${link.platform}${selectedDestination?.url === link.url ? " ug-listen-primary" : ""}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {selectedDestination?.url === link.url ? selectedDestination.label : link.label}
                </a>
              ))}
              {!selectedDestination && <span className="ug-profile-no-listen">Sin enlace de escucha verificado</span>}
            </div>
          </article>
        </div>
      )}
    </main>
  );
}

function NameLink({ person, onSelect }) {
  return (
    <button type="button" className="ug-name-link" onClick={() => onSelect(person)} title="Abrir enlaces">
      {person.name}
    </button>
  );
}

const WEB_TOYS = [
  { id: "ascii", label: "ASCII player", file: "ASCII.TXT", icon: "terminal" },
  { id: "guestbook", label: "Guestbook", file: "GUESTBOOK", icon: "book" },
  { id: "pet", label: "Pixel pet", file: "PET.GIF", icon: "pet" },
  { id: "webring", label: "Webring local", file: "WEBRING", icon: "globe" },
];

const WEB_BADGES = [
  "SUPPORT LOCAL",
  "HTML FOREVER",
  "GZK WEBRING",
  "NO ALGORITHM",
  "MP3 READY",
  "MADE IN EH",
  "BEST 800×600",
  "KONEKTA!",
  "DIY INTERNET",
  "REAL PEOPLE",
];

function WebcoreDesktop() {
  const [openToys, setOpenToys] = useState({ ascii: true, guestbook: true, pet: true, webring: false });
  const [guestMessage, setGuestMessage] = useState("");
  const [guestEntries, setGuestEntries] = useState([
    "webmaster: ongi etorri GZK sarera",
    "guest_013: support your local scene!",
  ]);
  const [petEnergy, setPetEnergy] = useState(3);

  const toggleToy = (id) => {
    setOpenToys((current) => ({ ...current, [id]: !current[id] }));
    playUiSound();
  };

  const addGuestEntry = (event) => {
    event.preventDefault();
    const cleanMessage = guestMessage.trim();
    if (!cleanMessage) return;
    setGuestEntries((current) => [...current.slice(-2), `guest_gzk: ${cleanMessage}`]);
    setGuestMessage("");
    playUiSound();
  };

  const surfToDirectory = () => {
    document.querySelector(".ug-board")?.scrollIntoView({ behavior: "smooth", block: "center" });
    playUiSound();
  };

  return (
    <section className="ug-webcore-layer" aria-label="Escritorio webcore de GZK">
      <nav className="ug-toy-dock" aria-label="Abrir juguetes webcore">
        {WEB_TOYS.map((toy) => (
          <button
            type="button"
            key={toy.id}
            className={openToys[toy.id] ? "active" : ""}
            onClick={() => toggleToy(toy.id)}
            aria-pressed={openToys[toy.id]}
            aria-label={`${openToys[toy.id] ? "Cerrar" : "Abrir"} ${toy.label}`}
          >
            <span className={`ug-toy-icon ug-toy-icon-${toy.icon}`} aria-hidden="true"><i /><i /></span>
            <b>{toy.file}</b>
          </button>
        ))}
      </nav>

      <div className="ug-webcore-windows">
        {openToys.ascii && (
          <RetroWindow id="ascii" title="ascii_player.txt" onClose={() => toggleToy("ascii")}>
            <pre className="ug-ascii-player" aria-label="Reproductor musical en arte ASCII">{` .----------------.
 |  GZK RADIO  o  |
 |  ▓▓▓▓▒▒░░  87 |
 |  [<<] [>] [>>] |
 '----------------'
   LOCAL SIGNAL`}</pre>
            <div className="ug-ascii-meter" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          </RetroWindow>
        )}

        {openToys.guestbook && (
          <RetroWindow id="guestbook" title="guestbook.html" onClose={() => toggleToy("guestbook")}>
            <div className="ug-guest-entries" aria-live="polite">
              {guestEntries.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}
            </div>
            <form className="ug-guest-form" onSubmit={addGuestEntry}>
              <label htmlFor="ug-guest-message">firma:</label>
              <input
                id="ug-guest-message"
                value={guestMessage}
                onChange={(event) => setGuestMessage(event.target.value)}
                maxLength={42}
                autoComplete="off"
              />
              <button type="submit">SEND</button>
            </form>
          </RetroWindow>
        )}

        {openToys.pet && (
          <RetroWindow id="pet" title="local_pet.gif" onClose={() => toggleToy("pet")}>
            <div className="ug-pixel-pet" aria-label={`Mascota pixel con energía ${petEnergy}`}>
              <span className="ug-pet-body"><i /><i /></span>
              <b>{"< GZK-BLOB />"}</b>
              <small>energy: {"♥".repeat(petEnergy)}{"·".repeat(5 - petEnergy)}</small>
            </div>
            <button className="ug-feed-pet" type="button" onClick={() => setPetEnergy((energy) => (energy % 5) + 1)}>
              FEED .GIF
            </button>
          </RetroWindow>
        )}

        {openToys.webring && (
          <RetroWindow id="webring" title="gzk_webring.exe" onClose={() => toggleToy("webring")}>
            <div className="ug-webring-console">
              <span>LOCAL NODE 087</span>
              <strong>GIPUZKOA ONLINE</strong>
              <p>artistas ↔ beats ↔ visuales ↔ sellos</p>
              <button type="button" onClick={surfToDirectory}>SURF THE SCENE</button>
            </div>
          </RetroWindow>
        )}
      </div>

      <div className="ug-web-badge-wall" aria-hidden="true">
        {WEB_BADGES.map((badge) => <span key={badge}>{badge}</span>)}
      </div>

      <div className="ug-cursor-sparkles" aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </div>
    </section>
  );
}

function RetroWindow({ id, title, onClose, children }) {
  return (
    <article className={`ug-webcore-window ug-webcore-window-${id}`}>
      <header>
        <span>{title}</span>
        <button type="button" onClick={onClose} aria-label={`Cerrar ${title}`}>×</button>
      </header>
      <div className="ug-webcore-window-body">{children}</div>
    </article>
  );
}
