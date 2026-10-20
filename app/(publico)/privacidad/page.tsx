import type { Metadata } from "next";
import PaginaSimple from "@/components/PaginaSimple";

export const metadata: Metadata = { title: "Privacidad · Montana Helados", alternates: { canonical: "/privacidad" } };

export default function Privacidad() {
  return (
    <PaginaSimple titulo="Privacidad">
      <p>Cuando armás un pedido en esta web guardamos solo lo necesario para prepararlo:</p>
      <ul>
        <li>Los sabores, las cantidades, la forma de entrega y el día.</li>
        <li>El nombre que escribís.</li>
        <li>Si pedís factura electrónica: nombre y apellido, RUC y correo, para emitirla y mandártela.</li>
        <li>Un código técnico que no permite saber quién sos, para frenar pedidos falsos repetidos.</li>
      </ul>
      <h2>Quién los ve y para qué</h2>
      <p>Solo la dueña de Montana Helados, desde el panel de la web. Los usa para preparar y entregar tu pedido, y para emitir la factura si la pediste. No los vendemos ni los compartimos.</p>
      <p>Para avisarle a la dueña que entró un pedido usamos un servicio de envío de emails (Resend). La web está en un servidor contratado por Montana Helados.</p>
      <h2>Cuánto tiempo los guardamos</h2>
      <p>Los pedidos se borran solos a los 12 meses. El código técnico para frenar pedidos falsos se borra a los 30 días.</p>
      <p>El pedido se termina de coordinar por WhatsApp; esa conversación queda en WhatsApp, como cualquier chat.</p>
      <h2>Sin publicidad ni seguimiento</h2>
      <p>La web no usa cookies de publicidad. Si contamos visitas, lo hacemos sin cookies y sin datos personales.</p>
      <h2>Si querés que borremos tus datos</h2>
      <p>Escribinos por WhatsApp y los borramos.</p>
    </PaginaSimple>
  );
}
