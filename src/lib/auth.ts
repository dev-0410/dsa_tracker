import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { Prisma } from '@prisma/client';
import { getServerSession, type NextAuthOptions, type Session } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

import { ApiError } from '@/lib/api-response';
import { safeAuthRedirect, shouldAllowGoogleSignIn } from '@/lib/auth-policy';
import { db } from '@/lib/db';
import { configuredAppUrl } from '@/lib/environment';

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const authSecret = process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();

function hasRealConfiguration(value: string | undefined): value is string {
  return Boolean(value && !/(?:your-|replace-|not-configured|placeholder)/i.test(value));
}

function hasStrongSecret(value: string | undefined): value is string {
  return Boolean(
    hasRealConfiguration(value) &&
      value.length >= 32 &&
      new Set(value).size >= 8,
  );
}

/** Exposed for health checks; placeholders keep imports and production builds side-effect free. */
export const isAuthConfigured =
  hasRealConfiguration(googleClientId) &&
  hasRealConfiguration(googleClientSecret) &&
  hasStrongSecret(authSecret) &&
  configuredAppUrl() !== null;

const BUILD_FALLBACK = 'not-configured-build-placeholder';

/**
 * Dev-only credential sign-in, so local work does not require Google OAuth.
 *
 * Gated on two independent conditions that both have to hold: the build must
 * not be production, and DEV_AUTH_BYPASS must be explicitly "true". Setting the
 * flag in a production build does nothing.
 */
export const isDevAuthBypassEnabled =
  process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === 'true';

const DEV_USER_EMAIL = process.env.DEV_AUTH_EMAIL?.trim() || 'dev@localhost';
const DEV_USER_NAME = process.env.DEV_AUTH_NAME?.trim() || 'Local Dev';

const devCredentialsProvider = CredentialsProvider({
  id: 'dev-bypass',
  name: 'Local development',
  credentials: {
    email: { label: 'Email', type: 'text', placeholder: DEV_USER_EMAIL },
  },
  async authorize(credentials) {
    if (!isDevAuthBypassEnabled) return null;

    const email = credentials?.email?.trim() || DEV_USER_EMAIL;
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return { id: existing.id, email: existing.email, name: existing.name };

    const created = await db.user.create({
      data: { email, name: DEV_USER_NAME, emailVerified: new Date() },
    });
    return { id: created.id, email: created.email, name: created.name };
  },
});

export const authOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: googleClientId || BUILD_FALLBACK,
      clientSecret: googleClientSecret || BUILD_FALLBACK,
      authorization: {
        params: {
          prompt: 'select_account',
          scope: 'openid email profile',
        },
      },
    }),
    ...(isDevAuthBypassEnabled ? [devCredentialsProvider] : []),
  ],
  secret: authSecret || BUILD_FALLBACK,
  // Credentials sign-in cannot use database sessions, so the bypass switches to
  // JWT. Production keeps database sessions because the bypass is never on.
  session: {
    strategy: isDevAuthBypassEnabled ? 'jwt' : 'database',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
    error: '/login',
    newUser: '/onboarding',
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (isDevAuthBypassEnabled && account?.provider === 'dev-bypass') return true;

      return shouldAllowGoogleSignIn({
        configurationReady: isAuthConfigured,
        provider: account?.provider,
        emailVerified: (profile as { email_verified?: boolean } | undefined)?.email_verified,
      });
    },
    async jwt({ token, user }) {
      // Only reached under the dev bypass, where the strategy is JWT.
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, user, token }) {
      if (!session.user) return session;

      // Database sessions supply `user`; the dev bypass uses JWT and supplies `token`.
      const userId = user?.id ?? (token?.userId as string | undefined);
      if (!userId) return session;

      const profile = await db.userProfile.findUnique({
        where: { userId },
        select: { handle: true, onboardingCompletedAt: true },
      });

      session.user.id = userId;
      session.user.handle = profile?.handle ?? null;
      session.user.onboardingComplete = Boolean(profile?.onboardingCompletedAt);
      return session;
    },
    async redirect({ url, baseUrl }) {
      return safeAuthRedirect(url, baseUrl);
    },
  },
  events: {
    async signIn({ user }) {
      await db.user.updateMany({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    },
  },
} satisfies NextAuthOptions;

const currentUserInclude = {
  profile: true,
} satisfies Prisma.UserInclude;

export type CurrentUser = Prisma.UserGetPayload<{ include: typeof currentUserInclude }>;
export type CompleteUser = CurrentUser & { profile: NonNullable<CurrentUser['profile']> };

export function auth(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export async function requireUser(): Promise<CurrentUser> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: currentUserInclude,
  });

  if (!user) {
    throw new ApiError(401, 'INVALID_SESSION', 'The current session is no longer valid.');
  }

  return user;
}

export async function requireCompleteUser(): Promise<CompleteUser> {
  const user = await requireUser();
  if (!user.profile?.onboardingCompletedAt) {
    throw new ApiError(403, 'ONBOARDING_REQUIRED', 'Complete your profile before using the platform.');
  }
  return user as CompleteUser;
}
