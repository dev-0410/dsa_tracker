import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      handle: string | null;
      onboardingComplete: boolean;
    } & DefaultSession['user'];
  }
}

export {};
