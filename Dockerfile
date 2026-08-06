# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl tini \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci

FROM base AS migration-dependencies
COPY docker/migrator/package.json docker/migrator/package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci && npx prisma generate

FROM base AS builder
ENV NODE_ENV=production
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV NEXTAUTH_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXTAUTH_SECRET=build-only-secret-not-used-at-runtime
ENV GOOGLE_CLIENT_ID=build-placeholder.apps.googleusercontent.com
ENV GOOGLE_CLIENT_SECRET=build-placeholder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS migrator
ENV NODE_ENV=production
COPY --from=migration-dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY scripts ./scripts
COPY docker/migrate.sh ./docker/migrate.sh
USER node
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./docker/migrate.sh"]

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs
WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
USER nextjs
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
