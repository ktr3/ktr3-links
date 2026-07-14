"use client";

import { useEffect, useState } from "react";

export default function SoundCloudRadioPlayer({ url, title, variant = "radio" }) {
  const [player, setPlayer] = useState({ status: "loading", embedUrl: null });

  useEffect(() => {
    const controller = new AbortController();
    setPlayer({ status: "loading", embedUrl: null });

    fetch(`/api/underground/soundcloud?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`SoundCloud player request failed: ${response.status}`);
        return response.json();
      })
      .then((payload) => setPlayer({ status: "ready", embedUrl: payload.embedUrl }))
      .catch((error) => {
        if (error.name !== "AbortError") setPlayer({ status: "failed", embedUrl: null });
      });

    return () => controller.abort();
  }, [url]);

  const embedClassName = variant === "profile"
    ? "ug-soundcloud-embed ug-profile-soundcloud-embed"
    : "ug-radio-embed ug-radio-embed-soundcloud ug-soundcloud-embed";

  if (player.status === "ready") {
    return (
      <iframe
        className={embedClassName}
        src={player.embedUrl}
        title={`SoundCloud: ${title}`}
        allow="autoplay; encrypted-media"
        loading={variant === "radio" ? "eager" : "lazy"}
      />
    );
  }

  return (
    <div className={`${embedClassName} ug-soundcloud-${player.status}`} aria-live="polite">
      {player.status === "loading" ? (
        <span>Conectando SoundCloud…</span>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer">Abrir en SoundCloud</a>
      )}
    </div>
  );
}
