import { listPublicResources } from "../../lib/resources/repository.js";
import ResourceLibrary from "./ResourceLibrary.js";
import styles from "./Resources.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recursos para productores — Ktr3",
  description: "Presets de Serum, MIDI, FX, one-shots, samples y plantillas creados por Ktr3 para productores musicales.",
  alternates: { canonical: "/recursos" },
  openGraph: {
    title: "Ktr3 Resources — Sonidos para productores",
    description: "Descarga presets, MIDI, FX, one-shots y plantillas creados por Ktr3.",
    url: "/recursos",
    type: "website",
  },
};

export default async function ResourcesPage() {
  let resources = [];
  let unavailable = false;
  try {
    resources = await listPublicResources();
  } catch (error) {
    console.error("Unable to render public resource library", error);
    unavailable = true;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Ktr3 Resources",
    description: "Recursos gratuitos para productores musicales.",
    url: "https://ktr3.es/recursos",
    hasPart: resources.map((resource) => ({
      "@type": "DigitalDocument",
      name: resource.title,
      description: resource.summary,
      encodingFormat: resource.file.mimeType,
      isAccessibleForFree: true,
      url: `https://ktr3.es/recursos#${resource.slug}`,
    })),
  };

  return (
    <main className={styles.page} id="main-content">
      <a className={styles.skipLink} href="#resource-grid">Saltar al catálogo</a>
      <div className={styles.ambient} aria-hidden="true" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ResourceLibrary
        initialResources={resources}
        unavailable={unavailable}
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
      />
    </main>
  );
}
