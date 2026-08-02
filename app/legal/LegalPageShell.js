import styles from "./Legal.module.css";

export default function LegalPageShell({ eyebrow, title, intro, children }) {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Navegación legal">
        <a href="/" className={styles.brand}>
          <img src="/logo.png" alt="" />
          <span>KTR3</span>
        </a>
        <a href="/recursos">Recursos</a>
      </nav>
      <article className={styles.document}>
        <header>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
          <small>Última actualización: 2 de agosto de 2026</small>
        </header>
        {children}
      </article>
      <footer className={styles.footer}>
        <a href="/privacidad">Privacidad</a>
        <a href="/cookies">Cookies</a>
        <a href="/legal">Información legal</a>
        <a href="mailto:prod.ktr3@gmail.com">Contacto</a>
      </footer>
    </main>
  );
}
