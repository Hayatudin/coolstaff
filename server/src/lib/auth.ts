import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import prismaAuth from './prisma-auth';

export const auth = betterAuth({
  database: prismaAdapter(prismaAuth, {
    provider: 'mysql',
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,             // 5 min client-side cache
    },
  },

  trustedOrigins: [
    'http://localhost:3000',
    'https://coolstaffagency.com',
    'https://www.coolstaffagency.com',
    'https://coolstaffagencyyy.vercel.app',
    'https://daera-agency.vercel.app', // Added common alternative
  ],

  advanced: {
    basePath: '/api/auth',
    cookie: {
      useSecureCookie: true,
      sameSite: "none",
    }
  } as any,

  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
