import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import db from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || '74RzhyeAPZVictmFaCAA/1TPEkfdE+469xOQtWgrPbI=',
  baseURL: process.env.BETTER_AUTH_URL || 'https://api.coolstaffagency.com',
  database: drizzleAdapter(db, {
    provider: 'mysql',
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  session: {
    expiresIn: 18000, // 5 hours session lifetime
    updateAge: 3600,  // refresh session after 1 hour of activity
    cookieCache: {
      enabled: true,
      maxAge: 3600,   // 1 hour client-side caching
    },
  },

  trustedOrigins: [
    'http://localhost:3000',
    'https://coolstaffagency.com',
    'https://www.coolstaffagency.com',
    'https://coolstaffagencyyy.vercel.app',
    'https://daera-agency.vercel.app',
  ],

  advanced: {
    basePath: '/api/auth',
    disableCSRFCheck: true,
    useSecureCookies: true,
    defaultCookieAttributes: {
      sameSite: "none" as const,
      secure: true,
    },
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
      agency: {
        type: 'string',
        required: false,
      },
      majorAgency: {
        type: 'string',
        required: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
