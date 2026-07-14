"use client";

import { useSpotifyController } from "../../hooks/useSpotifyController";
import { formatPlaybackTime } from "../../lib/underground/spotify";

export default function SpotifyRadioPlayer({ uri, embedUrl, type, title }) {
  const height = type === "track" ? 152 : 352;
  const { hostRef, playback, status, togglePlay, seek } = useSpotifyController(uri, height);
  const canSeek = playback.isReady && playback.duration > 0;
  const embedClassName = `ug-radio-embed ug-radio-embed-${type || "track"}`;

  return (
    <div className={`ug-radio-player ug-radio-player-${type || "track"}`}>
      <div
        ref={hostRef}
        className={`${embedClassName}${status === "failed" ? " ug-radio-controller-failed" : ""}`}
        aria-label={`Spotify: ${title}`}
      />
      {status === "failed" && embedUrl && (
        <iframe
          className={`${embedClassName} ug-radio-embed-fallback`}
          src={embedUrl}
          title={`Spotify: ${title}`}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="eager"
        />
      )}
      {status !== "failed" && (
        <div className="ug-playback-bar" aria-label="Controles de reproducción de Spotify">
          <button type="button" onClick={togglePlay} disabled={!playback.isReady}>
            {playback.isPaused ? "▶" : "Ⅱ"}
            <span className="ug-visually-hidden">{playback.isPaused ? "Reproducir" : "Pausar"}</span>
          </button>
          <time>{formatPlaybackTime(playback.position)}</time>
          <input
            type="range"
            min="0"
            max={Math.max(playback.duration, 1)}
            step="1000"
            value={Math.min(playback.position, Math.max(playback.duration, 1))}
            onChange={(event) => seek(event.target.value)}
            disabled={!canSeek}
            aria-label="Posición de la canción"
          />
          <time>{formatPlaybackTime(playback.duration)}</time>
        </div>
      )}
    </div>
  );
}
