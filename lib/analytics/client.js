import { redactAnalyticsEvent, shouldTrackPath } from "./privacy.js";

let client = null;
let starting = null;
let analyticsWanted = false;

function currentPath() {
  return typeof window === "undefined" ? "" : window.location.pathname;
}

export async function startAnalytics({ token, host }) {
  if (!token || !host || !shouldTrackPath(currentPath())) return null;
  analyticsWanted = true;
  if (client) {
    client.opt_in_capturing({ captureEventName: false });
    client.startSessionRecording();
    return client;
  }
  if (starting) return starting;

  starting = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(token, {
      api_host: host,
      ui_host: "https://eu.posthog.com",
      defaults: "2026-05-30",
      autocapture: {
        dom_event_allowlist: ["click", "change"],
        element_allowlist: ["a", "button", "details", "summary", "audio"],
        css_selector_ignorelist: [
          ".ph-no-autocapture",
          "[data-ph-no-autocapture]",
          ".ph-no-capture",
          "form",
          "input",
          "textarea",
          "select",
          "label",
          "[contenteditable]",
        ],
        element_attribute_ignorelist: [
          "value",
          "placeholder",
          "href",
          "data-token",
          "data-email",
        ],
      },
      capture_pageview: "history_change",
      capture_pageleave: true,
      capture_dead_clicks: true,
      capture_heatmaps: true,
      capture_performance: true,
      capture_exceptions: true,
      enable_recording_console_log: false,
      person_profiles: "identified_only",
      respect_dnt: true,
      mask_all_text: true,
      property_denylist: [
        "email",
        "name",
        "password",
        "token",
        "turnstileToken",
        "$ip",
      ],
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "form, dialog, .ph-sensitive, .ph-no-capture",
        recordCrossOriginIframes: false,
        capturePerformance: true,
        maskCapturedNetworkRequestFn(request) {
          if (request?.name) request.name = request.name.split(/[?#]/, 1)[0];
          return request;
        },
      },
      before_send: redactAnalyticsEvent,
      loaded(instance) {
        if (analyticsWanted) instance.startSessionRecording();
        else instance.opt_out_capturing();
      },
    });
    client = posthog;
    if (!analyticsWanted) {
      client.stopSessionRecording();
      client.opt_out_capturing();
      client.reset(true);
    }
    return client;
  }).finally(() => {
    starting = null;
  });

  return starting;
}

export function captureAnalyticsEvent(eventName, properties = {}) {
  if (!client || !analyticsWanted || !shouldTrackPath(currentPath())) return false;
  client.capture(eventName, properties);
  return true;
}

export function stopAnalytics() {
  analyticsWanted = false;
  if (!client) return;
  client.stopSessionRecording();
  client.opt_out_capturing();
  client.reset(true);
}
