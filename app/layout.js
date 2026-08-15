import "./globals.css";
import AnalyticsConsent from "./analytics/AnalyticsConsent.js";

const SITE_URL = "https://ktr3.es";

export const metadata = {
  title: "Ktr3 — Productor Musical | Beats & Links",
  description:
    "Productor musical. Beats, presets de Serum, MIDI, plantillas y recursos para productores.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITE_URL,
    siteName: "Ktr3",
    title: "Ktr3 — Productor Musical",
    description: "Beats, presets de Serum, MIDI, plantillas y recursos para productores.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ktr3 — Productor Musical",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ktr3 — Productor Musical",
    description: "Beats, presets de Serum, MIDI y recursos para productores.",
    images: ["/og-image.png"],
  },
  icons: { icon: "/favicon.png" },
};

export const viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: "Ktr3",
    url: SITE_URL,
    description: "Productor musical — Beats, Hip Hop, Trap",
    sameAs: [
      "https://www.instagram.com/ktr3ss/",
      "https://www.youtube.com/@prodbyktr3",
      "https://soundcloud.com/ktr3",
      "https://www.beatstars.com/ktr3",
    ],
  };

  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <AnalyticsConsent />
      </body>
    </html>
  );
}
