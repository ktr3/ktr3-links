import LegalPageShell from "../legal/LegalPageShell.js";
import styles from "../legal/Legal.module.css";

export const metadata = { title: "Política de cookies — Ktr3" };

export default function CookiesPage() {
  return (
    <LegalPageShell
      eyebrow="KTR3://STORAGE"
      title="Política de cookies"
      intro="Inventario del almacenamiento utilizado por Ktr3 Links y cómo puedes cambiar tu elección."
    >
      <section>
        <h2>Qué son</h2>
        <p>
          Las cookies y tecnologías similares, como localStorage, permiten mantener sesiones, recordar preferencias y,
          cuando lo autorizas, comprender cómo se utiliza la web.
        </p>
      </section>

      <section>
        <h2>Almacenamiento utilizado</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr><th>Nombre</th><th>Proveedor</th><th>Finalidad</th><th>Duración</th><th>Tipo</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>ktr3_privacy_choice</code></td><td>Ktr3</td>
                <td>Recordar si aceptaste o rechazaste la analítica.</td><td>12 meses</td><td>Necesaria</td>
              </tr>
              <tr>
                <td><code>ktr3_admin_session</code></td><td>Ktr3</td>
                <td>Mantener exclusivamente la sesión privada del administrador.</td><td>7 días</td><td>Necesaria</td>
              </tr>
              <tr>
                <td><code>ktr3-underground-*</code></td><td>Ktr3</td>
                <td>Recordar la vuelta RANDOM para evitar repeticiones.</td><td>Hasta borrar datos locales</td><td>Funcional</td>
              </tr>
              <tr>
                <td><code>ph_*_posthog</code></td><td>PostHog EU</td>
                <td>Sesión anónima, métricas, embudos, heatmaps y session replay enmascarado.</td><td>Máximo 12 meses</td><td>Analítica</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Cómo funciona el consentimiento</h2>
        <p>
          PostHog no se descarga ni se inicializa hasta aceptar la categoría analítica. Rechazar es tan directo como
          aceptar. Puedes cambiar la decisión en cualquier momento desde el botón «Privacidad» situado en la esquina
          inferior de la web; al retirar el permiso se detiene la captura y se limpia la persistencia analítica.
        </p>
      </section>

      <section>
        <h2>Protecciones aplicadas</h2>
        <ul>
          <li>Exclusión completa de <code>/admin</code> y rutas API.</li>
          <li>Campos de formularios, emails, nombres, contraseñas y tokens excluidos.</li>
          <li>Parámetros y fragmentos eliminados de las URLs antes de enviarlas.</li>
          <li>Descarte de direcciones IP obligatorio antes de activar esta integración en producción.</li>
          <li>Respeto de la señal Do Not Track cuando el navegador la proporcione.</li>
        </ul>
      </section>
    </LegalPageShell>
  );
}
