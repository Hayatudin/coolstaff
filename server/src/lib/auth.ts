import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prisma from './prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'mysql',
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
    useSecureCookies: process.env.BETTER_AUTH_URL?.startsWith('https://') ?? false,
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
