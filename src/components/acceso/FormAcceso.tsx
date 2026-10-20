"use client";
// Formularios de entrada al panel: entrar, pedir enlace para recuperar y elegir contraseña nueva.
import { useState } from "react";

type Modo = "entrar" | "recuperar" | "nueva";

async function post(ruta: string, cuerpo: unknown) {
  const r = await fetch(`/api/auth${ruta}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, d };
}

export default function FormAcceso({ modo, token }: { modo: Modo; token?: string }) {
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setOk(""); setEnviando(true);
    const f = new FormData(e.currentTarget);
    try {
      if (modo === "entrar") {
        const r = await post("/sign-in/email", { email: String(f.get("email")).trim(), password: f.get("clave"), rememberMe: true });
        if (r.ok) return window.location.assign("/gestionar");
        setError(r.status === 429 ? "Probaste muchas veces. Esperá 15 minutos y volvé a intentar." : "El email o la contraseña no coinciden.");
      } else if (modo === "recuperar") {
        const r = await post("/request-password-reset", { email: String(f.get("email")).trim(), redirectTo: "/gestionar/nueva-clave" });
        if (r.status === 429) setError("Pediste muchos enlaces. Esperá una hora.");
        else setOk("Si ese email es el del panel, te llegó un enlace para elegir una contraseña nueva. Vence en 1 hora.");
      } else {
        const clave = String(f.get("clave")), repetir = String(f.get("repetir"));
        if (clave.length < 10) setError("La contraseña tiene que tener 10 caracteres o más.");
        else if (clave !== repetir) setError("Las dos contraseñas no son iguales.");
        else {
          const r = await post("/reset-password", { newPassword: clave, token });
          if (r.ok) setOk("Listo. Ya podés entrar con tu contraseña nueva.");
          else setError("El enlace venció o ya se usó. Pedí uno nuevo.");
        }
      }
    } catch {
      setError("No hay conexión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="caja" onSubmit={enviar}>
      <p className="marca">Montana Helados</p>
      <h1>{modo === "entrar" ? "Entrar al panel" : modo === "recuperar" ? "Recuperar contraseña" : "Contraseña nueva"}</h1>
      {modo !== "nueva" ? (
        <div className="campo"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={120} /></div>
      ) : null}
      {modo === "entrar" ? (
        <div className="campo"><label htmlFor="clave">Contraseña</label><input id="clave" name="clave" type="password" autoComplete="current-password" required maxLength={128} /></div>
      ) : null}
      {modo === "nueva" ? (
        <>
          <div className="campo"><label htmlFor="clave">Contraseña nueva</label><input id="clave" name="clave" type="password" autoComplete="new-password" required minLength={10} maxLength={128} /><small>10 caracteres o más.</small></div>
          <div className="campo"><label htmlFor="repetir">Repetila</label><input id="repetir" name="repetir" type="password" autoComplete="new-password" required minLength={10} maxLength={128} /></div>
        </>
      ) : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
      {ok ? <p className="ok" role="status">{ok}</p> : null}
      {!(modo !== "entrar" && ok) ? (
        <button className="btn pri" type="submit" disabled={enviando}>
          {enviando ? "Un momento..." : modo === "entrar" ? "Entrar" : modo === "recuperar" ? "Mandarme el enlace" : "Guardar contraseña"}
        </button>
      ) : null}
      <p>{modo === "entrar" ? <a href="/gestionar/recuperar">Me olvidé la contraseña</a> : <a href="/gestionar/entrar">Volver a entrar</a>}</p>
    </form>
  );
}
