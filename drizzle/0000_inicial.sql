CREATE TYPE "public"."entrega" AS ENUM('retiro', 'bolt');--> statement-breakpoint
CREATE TYPE "public"."estado_notificacion" AS ENUM('pendiente', 'enviada', 'fallida');--> statement-breakpoint
CREATE TYPE "public"."estado_pedido" AS ENUM('nuevo', 'confirmado', 'sena_recibida', 'entregado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."estado_producto" AS ENUM('disponible', 'hoy_no_hay', 'agotado', 'oculto');--> statement-breakpoint
CREATE TYPE "public"."modalidad" AS ENUM('hoy', 'otro_dia');--> statement-breakpoint
CREATE TYPE "public"."producto" AS ENUM('gourmet', 'xl');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ajustes" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario" text NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" integer,
	"campo" text,
	"antes" text,
	"despues" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "condicion" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text DEFAULT '' NOT NULL,
	"texto" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalon_precio" (
	"id" serial PRIMARY KEY NOT NULL,
	"producto" "producto" NOT NULL,
	"desde" integer NOT NULL,
	"precio" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helado_xl" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"foto" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"estado" "estado_producto" DEFAULT 'disponible' NOT NULL,
	"eliminado_en" timestamp with time zone,
	CONSTRAINT "helado_xl_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notificacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"para" text NOT NULL,
	"datos" jsonb NOT NULL,
	"estado" "estado_notificacion" DEFAULT 'pendiente' NOT NULL,
	"intentos" integer DEFAULT 0 NOT NULL,
	"error" text,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	"enviado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pedido" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text,
	"modalidad" "modalidad" NOT NULL,
	"detalle" jsonb NOT NULL,
	"unidades_gourmet" integer NOT NULL,
	"precio_gourmet" integer NOT NULL,
	"unidades_xl" integer NOT NULL,
	"precio_xl" integer NOT NULL,
	"total" integer NOT NULL,
	"sena" integer NOT NULL,
	"entrega" "entrega" NOT NULL,
	"fecha_entrega" date NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text,
	"factura" jsonb,
	"estado" "estado_pedido" DEFAULT 'nuevo' NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"ip_hash" text,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	"eliminado_en" timestamp with time zone,
	CONSTRAINT "pedido_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "pregunta_frecuente" (
	"id" serial PRIMARY KEY NOT NULL,
	"pregunta" text NOT NULL,
	"respuesta" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"detalle" text DEFAULT '' NOT NULL,
	"foto" text,
	"texto_whatsapp" text DEFAULT '' NOT NULL,
	"desde" date,
	"hasta" date,
	"visible" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"terminada_en" timestamp with time zone,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "punto_venta" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"barrio" text,
	"link_mapa" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sabor" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"color" text NOT NULL,
	"foto" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"estado" "estado_producto" DEFAULT 'disponible' NOT NULL,
	"eliminado_en" timestamp with time zone,
	CONSTRAINT "sabor_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"rol" text DEFAULT 'duena' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "escalon_producto_desde" ON "escalon_precio" USING btree ("producto","desde");--> statement-breakpoint
CREATE INDEX "notificacion_estado" ON "notificacion" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "pedido_estado" ON "pedido" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "pedido_fecha_entrega" ON "pedido" USING btree ("fecha_entrega");--> statement-breakpoint
CREATE INDEX "pedido_creado" ON "pedido" USING btree ("creado");