"use client";

import { useState } from "react";
import styles from "./Admin.module.css";

export default function AdminLogin() {
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setState("submitting");
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error === "too_many_attempts"
            ? "Demasiados intentos. Espera 15 minutos."
            : "Email o contraseña incorrectos.",
        );
      }
      window.location.href = "/admin";
    } catch (error) {
      setState("error");
      setMessage(error.message);
    }
  }

  return (
    <main className={styles.loginPage}>
      <a href="/" className={styles.loginBack}>← Volver a ktr3.es</a>
      <section className={styles.loginPanel} aria-labelledby="admin-login-title">
        <div className={styles.loginLogo}>
          <img src="/logo.png" alt="" />
          <span>KTR3://CONTROL</span>
        </div>
        <p className={styles.terminalLine}>AUTHENTICATION REQUIRED_</p>
        <h1 id="admin-login-title">Panel de recursos</h1>
        <p className={styles.loginCopy}>Acceso privado para gestionar el catálogo de productores.</p>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" name="email" type="email" autoComplete="username" required autoFocus />
          <label htmlFor="admin-password">Contraseña</label>
          <input id="admin-password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit" disabled={state === "submitting"}>
            {state === "submitting" ? "Verificando…" : "Entrar al panel"}
          </button>
          <div className={styles.liveMessage} aria-live="polite">
            {message && <p role="alert">{message}</p>}
          </div>
        </form>
      </section>
    </main>
  );
}
