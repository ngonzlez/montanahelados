// Login del panel con Better Auth: email y contraseña, sin registro público.
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema as s } from "@/db";
import { enviarEmail, plantillaRecuperar } from "./email";

const URL_BASE = process.env.BETTER_AUTH_URL ?? process.env.SITE_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  baseURL: URL_BASE,
  // durante `next build` no hay secretos cargados; en ejecución, BETTER_AUTH_SECRET es obligatorio
  secret: process.env.BETTER_AUTH_SECRET ?? (process.env.NEXT_PHASE === "phase-production-build" ? "solo-para-el-build-no-se-usa-en-ejecucion" : undefined),
  trustedOrigins: [URL_BASE, process.env.SITE_URL ?? URL_BASE],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: s.user, session: s.session, account: s.account, verification: s.verification },
  }),
  user: { additionalFields: { rol: { type: "string", required: false, defaultValue: "duena", input: false } } },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // la dueña la crea la semilla (ADMIN_*); no hay registro público
    minPasswordLength: 10,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 h, un solo uso
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const p = plantillaRecuperar(url);
      await enviarEmail({ para: user.email, ...p });
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
  rateLimit: {
    enabled: true,
    storage: "memory",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 5 }, // bloqueo tras 5 intentos en 15 minutos
      "/request-password-reset": { window: 60 * 60, max: 3 },
      "/reset-password": { window: 15 * 60, max: 5 },
      "/change-password": { window: 15 * 60, max: 5 },
    },
  },
  advanced: {
    cookiePrefix: "mh",
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] },
  },
  plugins: [nextCookies()],
});
