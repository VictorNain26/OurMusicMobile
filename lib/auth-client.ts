import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: 'https://ourmusic-api.ovh/api/auth',
  plugins: [
    expoClient({
      scheme: 'ourmusicmobile',
      storagePrefix: 'ourmusicmobile',
      storage: SecureStore,
    }),
  ],
});
