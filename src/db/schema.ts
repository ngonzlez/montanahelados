import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// Convenciones (docs/web/modelo-datos.json): id serial, eliminado_en para papelera,
// precios enteros en guaraníes, fechas en America/Asuncion.

export const estadoProducto = pgEnum("estado_producto", ["disponible", "hoy_no_hay", "agotado", "oculto"]);
export const producto = pgEnum("producto", ["gourmet", "xl"]);
export const modalidad = pgEnum("modalidad", ["hoy", "otro_dia"]);
export const entrega = pgEnum("entrega", ["retiro", "bolt"]);
export const estadoPedido = pgEnum("estado_pedido", ["nuevo", "confirmado", "sena_recibida", "entregado", "cancelado"]);
export const estadoNotificacion = pgEnum("estado_notificacion", ["pendiente", "enviada", "fallida"]);

const eliminado = () => timestamp("eliminado_en", { withTimezone: true });

export const sabor = pgTable("sabor", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nombre: text("nombre").notNull(),
  color: text("color").notNull(),
  foto: text("foto"),
  orden: integer("orden").notNull().default(0),
  estado: estadoProducto("estado").notNull().default("disponible"),
  eliminadoEn: eliminado(),
});

export const heladoXl = pgTable("helado_xl", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion").notNull().default(""),
  foto: text("foto"),
  orden: integer("orden").notNull().default(0),
  estado: estadoProducto("estado").notNull().default("disponible"),
  eliminadoEn: eliminado(),
});

export const escalonPrecio = pgTable(
  "escalon_precio",
  {
    id: serial("id").primaryKey(),
    producto: producto("producto").notNull(),
    desde: integer("desde").notNull(),
    precio: integer("precio").notNull(),
  },
  (t) => [uniqueIndex("escalon_producto_desde").on(t.producto, t.desde)],
);

export const promo = pgTable("promo", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  detalle: text("detalle").notNull().default(""),
  foto: text("foto"),
  textoWhatsapp: text("texto_whatsapp").notNull().default(""),
  desde: date("desde"),
  hasta: date("hasta"),
  visible: boolean("visible").notNull().default(true),
  orden: integer("orden").notNull().default(0),
  // Promo que se arma en la web: con mínimo, el cliente elige sabores en el armador.
  // Sin mínimo, la promo solo abre WhatsApp con el texto (como antes).
  minimo: integer("minimo"),
  precioUnidad: integer("precio_unidad"), // G. por heladito dentro de la promo; null = precio por cantidad normal
  sabores: jsonb("sabores").$type<string[] | null>(), // slugs de heladitos que entran; null = todos
  terminadaEn: timestamp("terminada_en", { withTimezone: true }),
  eliminadoEn: eliminado(),
});

export type LineaPedido = { tipo: "gourmet" | "xl"; sabor: string; cantidad: number };
export type DatosFactura = { nombre_apellido: string; ruc: string; correo: string };
export type PromoPedido = { id: number; titulo: string; minimo: number; precioUnidad: number | null };

export const pedido = pgTable(
  "pedido",
  {
    id: serial("id").primaryKey(),
    codigo: text("codigo").unique(),
    modalidad: modalidad("modalidad").notNull(),
    detalle: jsonb("detalle").$type<LineaPedido[]>().notNull(),
    unidadesGourmet: integer("unidades_gourmet").notNull(),
    precioGourmet: integer("precio_gourmet").notNull(),
    unidadesXl: integer("unidades_xl").notNull(),
    precioXl: integer("precio_xl").notNull(),
    total: integer("total").notNull(),
    sena: integer("sena").notNull(),
    entrega: entrega("entrega").notNull(),
    fechaEntrega: date("fecha_entrega").notNull(),
    nombre: text("nombre").notNull(),
    telefono: text("telefono"),
    factura: jsonb("factura").$type<DatosFactura | null>(),
    promo: jsonb("promo").$type<PromoPedido | null>(), // promo congelada al momento del pedido
    estado: estadoPedido("estado").notNull().default("nuevo"),
    notas: text("notas").notNull().default(""),
    ipHash: text("ip_hash"),
    creado: timestamp("creado", { withTimezone: true }).notNull().defaultNow(),
    eliminadoEn: eliminado(),
  },
  (t) => [index("pedido_estado").on(t.estado), index("pedido_fecha_entrega").on(t.fechaEntrega), index("pedido_creado").on(t.creado)],
);

export const preguntaFrecuente = pgTable("pregunta_frecuente", {
  id: serial("id").primaryKey(),
  pregunta: text("pregunta").notNull(),
  respuesta: text("respuesta").notNull(),
  visible: boolean("visible").notNull().default(true),
  orden: integer("orden").notNull().default(0),
});

export const condicion = pgTable("condicion", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull().default(""),
  texto: text("texto").notNull(),
  visible: boolean("visible").notNull().default(true),
  orden: integer("orden").notNull().default(0),
});

export const puntoVenta = pgTable("punto_venta", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  barrio: text("barrio"),
  linkMapa: text("link_mapa").notNull(),
  visible: boolean("visible").notNull().default(true),
  orden: integer("orden").notNull().default(0),
  eliminadoEn: eliminado(),
});

export const notificacion = pgTable(
  "notificacion",
  {
    id: serial("id").primaryKey(),
    tipo: text("tipo").notNull(),
    para: text("para").notNull(),
    datos: jsonb("datos").$type<Record<string, unknown>>().notNull(),
    estado: estadoNotificacion("estado").notNull().default("pendiente"),
    intentos: integer("intentos").notNull().default(0),
    error: text("error"),
    creado: timestamp("creado", { withTimezone: true }).notNull().defaultNow(),
    enviadoEn: timestamp("enviado_en", { withTimezone: true }),
  },
  (t) => [index("notificacion_estado").on(t.estado)],
);

export const auditoria = pgTable("auditoria", {
  id: serial("id").primaryKey(),
  usuario: text("usuario").notNull(),
  entidad: text("entidad").notNull(),
  entidadId: integer("entidad_id"),
  campo: text("campo"),
  antes: text("antes"),
  despues: text("despues"),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
});

export const ajustes = pgTable("ajustes", {
  clave: text("clave").primaryKey(),
  valor: jsonb("valor").notNull(),
});

// Tablas de Better Auth (login del panel). Usan id de texto, como pide la librería.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  rol: text("rol").notNull().default("duena"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
