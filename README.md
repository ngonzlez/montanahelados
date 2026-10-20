# Montana Helados

Web de Montana Helados, heladitos gourmet de San Lorenzo (barrio Reducto), Paraguay.
Catálogo de sabores y Helados XL, promos, puntos de venta y un armador de pedidos que calcula el precio por cantidad y abre WhatsApp con el pedido escrito. La dueña lo administra desde un panel.

Producción: https://montanahelados.nogashopp.com

## Stack

- Next.js 15 (App Router, TypeScript), `output: "standalone"`, un contenedor
- PostgreSQL + Drizzle ORM (migraciones en `drizzle/`, se aplican al arrancar)
- Better Auth para el panel (`/gestionar`)
- Fotos en volumen persistente de Coolify (`/data/archivos`)
- Resend para los avisos de pedidos nuevos
- Docker + Coolify

## Cómo levantarla en tu compu

Necesitás Node 22 y un PostgreSQL.

```bash
npm ci
cp .env.example .env        # completá DATABASE_URL y los secretos
npm run db:migrate          # crea las tablas
npm run db:seed             # carga sabores, precios, promos, puntos de venta y ajustes
npm run dev                 # http://localhost:3000
```

Para generar los secretos: `openssl rand -base64 32` (BETTER_AUTH_SECRET) y `openssl rand -hex 24` (IP_HASH_SECRETO).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests unitarios (precios, validación, WhatsApp, límite de pedidos) |
| `npm run typecheck` | Chequeo de tipos |
| `npm run lint` | ESLint |
| `npm run build` | Build de producción |
| `npm run db:generate` | Nueva migración después de cambiar `src/db/schema.ts` |
| `npm run db:migrate` | Aplica migraciones |
| `npm run db:seed` | Semilla (solo carga tablas vacías, nunca pisa lo que cambió la dueña) |
| `npm run job:emails` | Manda los avisos pendientes de la cola |
| `npm run job:purgar` | Borra pedidos de más de 12 meses y hashes de IP de más de 30 días |

## Estructura

```
app/(publico)/        inicio, condiciones, privacidad
app/gestionar/        panel de la dueña (protegido)
app/api/pedidos/      guarda el pedido y devuelve el enlace de WhatsApp
app/api/health/       chequeo de salud para Coolify
src/lib/precios.ts    cálculo único de precios y seña (cliente y servidor)
src/lib/pedido.ts     validación del pedido
src/lib/whatsapp.ts   mensaje y enlace wa.me
src/lib/limite.ts     límite de pedidos por IP
src/db/               esquema, conexión, migración y semilla
src/components/       armador, efectos de movimiento y arte de marca
jobs/                 tareas programadas
drizzle/              migraciones
tests/unit/           vitest
```

## Reglas de negocio

- Los precios salen de la tabla `escalon_precio`, nunca de números en el código. Heladitos: 1 → G. 3.000, 50 → G. 2.500, 100 → G. 2.000. XL: 1 → G. 7.000, 30 → G. 5.000. Los escalones suman todos los sabores.
- Seña del 50 % (ajustes), redondeada a G. 1.000.
- "Para hoy": paquetes de 25 de un solo sabor, solo sabores "Disponible". "Para otro día": desde mañana y hasta 90 días, cualquier cantidad, sabores "Disponible" u "Hoy no hay".
- "Agotado" se ve pero no se puede pedir; "Oculto" no aparece.
- El servidor valida y recalcula todo antes de guardar. Nunca se confía en precios del navegador.
- El mensaje de WhatsApp solo se abre; la web nunca dice que se envió.

## Deploy en Coolify

1. PostgreSQL 16 como recurso; su URL interna va en `DATABASE_URL`.
2. App desde este repo, rama `main`, build pack Dockerfile, puerto 3000.
3. Dominio `https://montanahelados.nogashopp.com` (registro A al servidor).
4. Volumen persistente montado en `/data/archivos`.
5. Variables de entorno: las de `.env.example`, con `SITE_URL` y `BETTER_AUTH_URL` en el dominio de producción y `ARCHIVOS_DIR=/data/archivos`.
6. Health check: `/api/health`.
7. Scheduled Tasks (dentro de la app):
   - `node dist/enviar-emails.mjs`, cada minuto (`* * * * *`): manda los avisos de pedidos nuevos.
   - `node dist/purgar-datos.mjs`, todos los días a las 03:10 (`10 3 * * *`): pedidos a 12 meses, hash de IP a 30 días, papelera a 30 días, sesiones vencidas.
8. Backups: Scheduled Backups diario del PostgreSQL y copia diaria del volumen fuera del servidor (Coolify no respalda volúmenes). Probar una restauración antes de lanzar.

Al arrancar, el contenedor corre `migrate`, `seed` y después la app. La semilla crea el usuario del panel con `ADMIN_EMAIL`, `ADMIN_NOMBRE` y `ADMIN_PASSWORD` (mínimo 10 caracteres) si todavía no existe; después la dueña cambia la contraseña desde Ajustes.

## Panel de la dueña

`/gestionar` (login con email y contraseña). Inicio con pedidos nuevos y de mañana, botón "Todo disponible"; pedidos con filtros, búsqueda y paginado en el servidor, estado y notas; sabores y Helados XL con estado (Disponible, Hoy no hay, Agotado, Oculto), cambio en lote y fotos; precios por cantidad; promos con foto, fechas, terminar y duplicar; puntos de venta; textos de la web (títulos y textos de cada sección, y cómo aparece en Google; vacío = texto original); ajustes (email de avisos con prueba, WhatsApp, redes, horario, mapa, seña, datos de pago privados, contraseña); papelera de 30 días.

- Sin registro público: el único usuario lo crea la semilla.
- Recuperar contraseña por email (enlace de un uso, vence en 1 hora). Necesita Resend configurado.
- Fotos: JPG, PNG o WebP hasta 8 MB; se verifica el tipo real, se pasan a WebP de 1200 px y se guardan en `ARCHIVOS_DIR/fotos` (servidas en `/media/fotos/...`).

## Seguridad

- Secretos solo en variables de entorno; `.env` no se sube a Git.
- Cabeceras: HSTS, CSP con `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, Referrer-Policy y Permissions-Policy (`next.config.ts`).
- Pedidos: validación con Zod, recálculo en el servidor, honeypot anti-robots, límite de 8 pedidos cada 10 minutos por IP y 60 por minuto en total, cuerpo de máximo 16 KB.
- La IP real se toma de `x-real-ip` (la pone Traefik) y se guarda solo como hash con secreto (`IP_HASH_SECRETO`); se borra a los 30 días.
- Panel: sesión verificada en el servidor en cada página y cada acción; las acciones exigen que el pedido venga de la propia web (Origin); 5 intentos de login cada 15 minutos; contraseñas de 10 caracteres o más; cookies HttpOnly, Secure y SameSite=Lax; cambios registrados en `auditoria`.
- Los datos de pago se guardan como ajuste privado y nunca se mandan a la web pública.
- Contenedor con usuario sin privilegios.
- CI: lint, tipos, tests, build, migraciones contra Postgres y `npm audit` (falla con vulnerabilidades altas).

Checklist completa y estado: `docs/PRD.md`, sección 11.1 (fuera del repo, en la carpeta del estudio).

## Documentación del proyecto

Los documentos mandan: `docs/PRD.md` y `docs/web/*.json` (sitemap, modelo de datos, flujos, contenido inicial, notificaciones, stack, panel, design system). Si cambia una regla, primero se actualiza el documento y después el código. Ver también `CLAUDE.md`.
