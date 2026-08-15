import LegalPageShell from "../legal/LegalPageShell.js";
import styles from "../legal/Legal.module.css";
import { publicLegalIdentity } from "../../lib/legal/public-identity.js";

export const metadata = {
  title: "Política de privacidad — Ktr3",
  robots: { index: true, follow: true },
};
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const identity = publicLegalIdentity();

  return (
    <LegalPageShell
      eyebrow="KTR3://PRIVACY"
      title="Política de privacidad"
      intro="Cómo tratamos los datos de navegación, las solicitudes de recursos y las suscripciones de la comunidad Ktr3."
    >
      <section>
        <h2>1. Responsable y contacto</h2>
        {identity.complete ? (
          <p>
            Responsable: {identity.name}, identificación fiscal {identity.taxId}, con domicilio profesional en{" "}
            {identity.address}. Contacto para privacidad y ejercicio de derechos:{" "}
            <a href={`mailto:${identity.email}`}>{identity.email}</a>.
          </p>
        ) : (
          <p className={styles.callout}>
            Identidad legal pendiente de configurar en el entorno privado de desarrollo.
          </p>
        )}
      </section>

      <section>
        <h2>2. Datos y finalidades</h2>
        <h3>Navegación y mejora de la web</h3>
        <p>
          Solo tras aceptar analítica recogemos páginas visitadas sin parámetros privados, dispositivo, navegador,
          procedencia, clics, profundidad de scroll, rendimiento, embudos y reconstrucciones enmascaradas de sesión.
          No grabamos el panel administrativo ni el contenido introducido en formularios.
        </p>
        <p>
          En Underground también contabilizamos qué perfiles se muestran en RANDOM, qué fichas se abren, qué rol se
          filtra, si una búsqueda devuelve pocos o muchos resultados y a qué plataforma se sale. Para estas métricas
          usamos identificadores aleatorios que se convierten en una huella HMAC antes de guardarse. No conservamos la
          búsqueda escrita, la IP, el email, el nombre del visitante ni la URL externa completa.
        </p>
        <h3>Entrega de recursos</h3>
        <p>
          Tratamos el email y, opcionalmente, el nombre para enviar el enlace solicitado, prevenir abuso y contabilizar
          la entrega. Estos datos no se incorporan a PostHog.
        </p>
        <p>
          Para limitar solicitudes automatizadas generamos temporalmente huellas pseudónimas mediante HMAC del email y
          de la dirección IP. No almacenamos la IP en claro en este registro de seguridad. También contrastamos el
          dominio del email con una lista local de proveedores temporales conocidos; este filtro reduce el abuso, pero
          no garantiza por sí solo que una dirección sea permanente.
        </p>
        <h3>Comunidad y comunicaciones</h3>
        <p>
          Solo enviaremos nuevos recursos, tips o promociones cuando marques la casilla opcional y confirmes la
          suscripción. La baja estará disponible en cada comunicación.
        </p>
      </section>

      <section>
        <h2>3. Bases jurídicas</h2>
        <ul>
          <li>Prestación del servicio solicitado para entregar un recurso.</li>
          <li>Consentimiento para analítica, mapas de calor y reconstrucciones de sesión.</li>
          <li>Consentimiento separado para comunicaciones de la comunidad.</li>
          <li>Interés legítimo y obligaciones legales para seguridad, prevención del fraude y defensa de reclamaciones.</li>
        </ul>
      </section>

      <section>
        <h2>4. Proveedores</h2>
        <p>
          Podemos utilizar alojamiento propio, PostgreSQL, Cloudflare Turnstile para protección antiabuso, el proveedor
          de correo configurado para las entregas y PostHog Cloud EU para analítica consentida. PostHog EU aloja los
          datos en Frankfurt. La configuración del proyecto debe mantener activo el descarte de la IP del cliente.
        </p>
      </section>

      <section>
        <h2>5. Conservación</h2>
        <ul>
          <li>Preferencia de privacidad: 12 meses o hasta que la cambies.</li>
          <li>Enlaces temporales de descarga: 24 horas.</li>
          <li>Huellas pseudónimas para limitar solicitudes: máximo 24 horas.</li>
          <li>Reconstrucciones de sesión: objetivo máximo de 30 días.</li>
          <li>Eventos seudónimos propios de Underground y analítica agregada: máximo 14 meses.</li>
          <li>Suscripción: hasta retirar el consentimiento, conservando la prueba estrictamente necesaria.</li>
        </ul>
      </section>

      <section>
        <h2>6. Tus derechos</h2>
        <p>
          Puedes solicitar acceso, rectificación, supresión, oposición, limitación, portabilidad o retirar tu
          consentimiento escribiendo a <a href={`mailto:${identity.email}`}>{identity.email}</a>. También puedes
          reclamar ante la <a href="https://www.aepd.es/">Agencia Española de Protección de Datos</a>.
        </p>
      </section>
    </LegalPageShell>
  );
}
