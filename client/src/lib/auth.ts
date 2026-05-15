import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prismaAuth from './prisma-auth';

export const auth = betterAuth({
  // Use the standard (non-serverless) Prisma client
  database: prismaAdapter(prismaAuth, {
    provider: 'mysql',
  }),

  // Email + password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  // Session configuration
  session: {
    expiresIn:  60 * 60 * 24 * 7, // 7 days
    updateAge:  60 * 60 * 24,      // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge:  60 * 5,             // 5 min client-side cache
    },
  },

  // Trust the configured origin
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000',
    'http://coolstaffagency.com',
    'https://coolstaffagency.com',
    'http://www.coolstaffagency.com',
    'https://www.coolstaffagency.com',
    'https://coolstaffagency.vercel.app',
  ],

  // Map the 'role' field from the database to the session user object
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
    },
  },
});

export type Session  = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
