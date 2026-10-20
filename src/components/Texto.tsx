// Texto editable desde el panel: solo admite **negrita**; todo lo demás se muestra tal cual (sin HTML).
import { Fragment } from "react";

export default function Texto({ t }: { t: string }) {
  const partes = t.split(/\*\*(.+?)\*\*/g);
  return <>{partes.map((x, i) => (i % 2 ? <b key={i}>{x}</b> : <Fragment key={i}>{x}</Fragment>))}</>;
}
