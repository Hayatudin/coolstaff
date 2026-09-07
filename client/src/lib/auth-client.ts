import { createAuthClient } from 'better-auth/react';
import { getApiBaseUrl } from './utils';

export const authClient = createAuthClient({
  baseURL: getApiBaseUrl(),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
      agency: {
        type: 'string',
      },
      majorAgency: {
        type: 'string',
      },
    },
  },
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  changePassword,
  updateUser,
} = authClient;
