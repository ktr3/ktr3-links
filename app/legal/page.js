import LegalPageShell from "./LegalPageShell.js";
import styles from "./Legal.module.css";
import { publicLegalIdentity } from "../../lib/legal/public-identity.js";

export const metadata = { title: "Información legal — Ktr3" };
export const dynamic = "force-dynamic";

export default function LegalPage() {
  const identity = publicLegalIdentity();

  return (
    <LegalPageShell
      eyebrow="KTR3://LEGAL"
      title="Información legal"
      intro="Información general sobre el responsable y las condiciones de acceso a ktr3.es."
    >
      <section>
        <h2>Titular del sitio</h2>
        {identity.complete ? (
          <ul>
            <li>Nombre o razón social: {identity.name}</li>
            <li>Identificación fiscal: {identity.taxId}</li>
            <li>Domicilio profesional: {identity.address}</li>
            <li>Sitio web: ktr3.es</li>
            <li>Contacto: <a href={`mailto:${identity.email}`}>{identity.email}</a></li>
          </ul>
        ) : (
          <p className={styles.callout}>
            Identidad legal pendiente de configurar en el entorno privado de desarrollo.
          </p>
        )}
      </section>
      <section>
        <h2>Propiedad intelectual</h2>
        <p>
          El diseño, textos, marca y recursos originales pertenecen a sus respectivos titulares. Descargar un archivo
          no implica adquirir la propiedad del archivo fuente ni permiso para redistribuirlo. La licencia concreta que
          acompañe a cada recurso prevalecerá sobre esta información general.
        </p>
      </section>
      <section>
        <h2>Responsabilidad</h2>
        <p>
          Ktr3 procura mantener la información y los archivos disponibles y seguros, pero no garantiza compatibilidad
          con todas las versiones de DAW o plugins. Los enlaces externos se facilitan como referencia y están sujetos a
          las condiciones de sus respectivos titulares.
        </p>
      </section>
    </LegalPageShell>
  );
}
