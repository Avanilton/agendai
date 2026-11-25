import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { sendTransactionalEmail } from "@/lib/email/sender";

function createAuth() {
  const isProd = process.env.NODE_ENV === "production";

  return betterAuth({
    appName: "Agendai",
    baseURL: process.env.BETTER_AUTH_URL || undefined,
    secret:
      process.env.BETTER_AUTH_SECRET ||
      "agendai-dev-only-secret-change-in-production-min-32-chars",
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        rateLimit: schema.rateLimits,
      },
    }),
    user: {
      additionalFields: {
        isPlatformAdmin: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false, // Never allow clients to self-assign platform admin
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh daily
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
      additionalFields: {
        activeOrganizationId: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: false,
      async sendResetPassword({ user, url }) {
        await sendTransactionalEmail({
          to: user.email,
          subject: "Redefinição de senha — Agendai",
          text: `Olá ${user.name}, acesse o link para redefinir sua senha no Agendai: ${url}`,
          html: `<p>Olá <strong>${user.name}</strong>,</p><p>Clique no link abaixo para redefinir sua senha no Agendai:</p><p><a href="${url}">Redefinir minha senha</a></p><p>Se você não solicitou esta alteração, ignore este e-mail.</p>`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      async sendVerificationEmail({ user, url }) {
        await sendTransactionalEmail({
          to: user.email,
          subject: "Confirme seu e-mail — Agendai",
          text: `Olá ${user.name}, confirme seu e-mail no Agendai acessando: ${url}`,
          html: `<p>Olá <strong>${user.name}</strong>,</p><p>Confirme seu endereço de e-mail clicando no botão abaixo:</p><p><a href="${url}">Confirmar e-mail</a></p>`,
        });
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
      storage: "database",
      customRules: {
        "/sign-in/email": {
          window: 60 * 15, // 15 minutes
          max: 10, // Brute-force protection with temporary lockout
        },
        "/sign-up/email": {
          window: 60 * 15,
          max: 5,
        },
        "/request-password-reset": {
          window: 60 * 15,
          max: 5,
        },
      },
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
      useSecureCookies: isProd,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
      },
    },
    plugins: [nextCookies()],
  });
}

let cachedAuth: ReturnType<typeof createAuth> | null = null;

export function getAuth() {
  if (!cachedAuth) {
    cachedAuth = createAuth();
  }
  return cachedAuth;
}

