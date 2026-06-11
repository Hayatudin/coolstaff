import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:4000',
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
      agency: {
        type: 'string',
      },
    },
  },
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
  changePassword,
  updateUser,
} = authClient;
