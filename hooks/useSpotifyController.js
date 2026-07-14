"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadSpotifyUriIfChanged } from "../lib/underground/spotify";

const SPOTIFY_IFRAME_API = "https://open.spotify.com/embed/iframe-api/v1";
const SPOTIFY_LOAD_TIMEOUT = 8000;
let iframeApiPromise = null;

function loadSpotifyIframeApi() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.__gzkSpotifyIframeApi) {
    return Promise.resolve(window.__gzkSpotifyIframeApi);
  }
  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise((resolve, reject) => {
    const previousReadyHandler = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (iframeApi) => {
      window.__gzkSpotifyIframeApi = iframeApi;
      resolve(iframeApi);
      previousReadyHandler?.(iframeApi);
    };

    const existingScript = document.querySelector(`script[src="${SPOTIFY_IFRAME_API}"]`);
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = SPOTIFY_IFRAME_API;
    script.async = true;
    script.onerror = () => {
      iframeApiPromise = null;
      reject(new Error("Spotify iFrame API could not be loaded"));
    };
    document.head.appendChild(script);
  });

  return iframeApiPromise;
}

export function useSpotifyController(uri, height) {
  const hostRef = useRef(null);
  const controllerRef = useRef(null);
  const loadedUriRef = useRef(null);
  const latestUriRef = useRef(uri);
  const [status, setStatus] = useState("loading");
  const [playback, setPlayback] = useState({
    duration: 0,
    position: 0,
    isPaused: true,
    isReady: false,
  });

  latestUriRef.current = uri;

  useEffect(() => {
    if (!latestUriRef.current || !hostRef.current) return undefined;

    let disposed = false;
    let failed = false;
    const host = hostRef.current;
    const target = document.createElement("div");
    target.className = "ug-spotify-controller-target";
    host.replaceChildren();
    host.appendChild(target);
    setStatus("loading");
    setPlayback({ duration: 0, position: 0, isPaused: true, isReady: false });

    const failToFallback = () => {
      if (disposed || failed) return;
      failed = true;
      controllerRef.current?.destroy?.();
      controllerRef.current = null;
      loadedUriRef.current = null;
      host.replaceChildren();
      setStatus("failed");
    };
    const loadTimeout = window.setTimeout(failToFallback, SPOTIFY_LOAD_TIMEOUT);

    loadSpotifyIframeApi()
      .then((iframeApi) => {
        if (!iframeApi || disposed || failed || !host.isConnected) return;

        const initialUri = latestUriRef.current;

        iframeApi.createController(
          target,
          { uri: initialUri, width: "100%", height },
          (controller) => {
            if (disposed || failed) {
              controller.destroy?.();
              return;
            }

            window.clearTimeout(loadTimeout);
            controllerRef.current = controller;
            loadedUriRef.current = initialUri;
            loadedUriRef.current = loadSpotifyUriIfChanged(
              controller,
              loadedUriRef.current,
              latestUriRef.current,
            );
            setStatus("ready");
            setPlayback((current) => ({ ...current, isReady: true }));
            controller.addListener("playback_update", (event) => {
              const data = event?.data || event || {};
              setPlayback({
                duration: Number(data.duration) || 0,
                position: Number(data.position) || 0,
                isPaused: data.isPaused !== false,
                isReady: true,
              });
            });
          },
        );
      })
      .catch(failToFallback);

    return () => {
      disposed = true;
      window.clearTimeout(loadTimeout);
      controllerRef.current?.destroy?.();
      controllerRef.current = null;
      loadedUriRef.current = null;
      host.replaceChildren();
    };
  }, [height]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || status !== "ready") return;

    const previousUri = loadedUriRef.current;
    loadedUriRef.current = loadSpotifyUriIfChanged(controller, previousUri, uri);

    if (previousUri !== loadedUriRef.current) {
      setPlayback({ duration: 0, position: 0, isPaused: true, isReady: true });
    }
  }, [status, uri]);

  const togglePlay = useCallback(() => {
    controllerRef.current?.togglePlay?.();
  }, []);

  const seek = useCallback((position) => {
    const safePosition = Math.max(0, Math.min(Number(position) || 0, playback.duration));
    controllerRef.current?.seek?.(safePosition);
    setPlayback((current) => ({ ...current, position: safePosition }));
  }, [playback.duration]);

  return { hostRef, playback, status, togglePlay, seek };
}
