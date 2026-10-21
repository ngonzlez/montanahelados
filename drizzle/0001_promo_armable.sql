ALTER TABLE "pedido" ADD COLUMN "promo" jsonb;--> statement-breakpoint
ALTER TABLE "promo" ADD COLUMN "minimo" integer;--> statement-breakpoint
ALTER TABLE "promo" ADD COLUMN "precio_unidad" integer;--> statement-breakpoint
ALTER TABLE "promo" ADD COLUMN "sabores" jsonb;