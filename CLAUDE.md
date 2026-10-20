# Montana Helados: repo del MVP

Web de heladitos gourmet (San Lorenzo, Paraguay): catálogo, armador de pedidos que abre WhatsApp y panel de la dueña.

## Antes de tocar código
- Leer la skill del cliente: `docs/skills/montana-web/SKILL.md` (y `montana-marca`, `montana-iconos-animados` para lo visual).
- Los documentos mandan: `docs/PRD.md` y `docs/web/*.json`. Si cambia una regla, primero el documento y su registro de cambios, después el código.
- Prototipo aprobado de referencia: `prototipo/netlify/index.html` (web) y `prototipo/netlify/panel.html` (panel).
- `docs/`, `fotos/`, `prototipo/` y el resto del material del estudio no van a Git (ver `.gitignore`).

## Estructura
- `app/(publico)/` páginas públicas · `app/gestionar/` panel (Better Auth) · `app/api/` health y pedidos.
- `src/lib/precios.ts` cálculo único (cliente y servidor) · `src/lib/pedido.ts` validación · `src/lib/whatsapp.ts` mensaje y enlace.
- `src/db/schema.ts` esquema Drizzle · `drizzle/` migraciones · `src/db/seed.ts` semilla desde `src/db/seed-data.json` (copia de `docs/web/contenido-inicial.json`).

## Comandos
- `npm run dev` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run build`
- `npm run db:generate` (nueva migración tras cambiar el esquema) · `npm run db:migrate` · `npm run db:seed`

## Reglas
- Precios siempre desde `escalon_precio`; nunca números fijos. Seña desde ajustes, redondeada a 1.000.
- Nunca decir que un WhatsApp "se envió": solo se abre el chat.
- Sin secretos en el repo: variables en Coolify (ver `.env.example`).
- Interfaz en español con voseo, precios "G. 125.000", fechas dd/mm/aaaa, zona America/Asuncion.
