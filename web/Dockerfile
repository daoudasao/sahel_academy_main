# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# Site web Sahel Academy (Next.js) — dashboard admin + pages publiques.
# Image de production « standalone » : légère et autonome.
# La base de données est externe (Neon) : fournir DATABASE_URL au run.
# ─────────────────────────────────────────────────────────────

# ─── Étape 1 : dépendances ───
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile

# ─── Étape 2 : build ───
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables « NEXT_PUBLIC_* » : figées dans le bundle client au build.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_VERIF_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:3001/api/v1}
ENV NEXT_PUBLIC_VERIF_URL=${NEXT_PUBLIC_VERIF_URL:-http://localhost:3000}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# `pnpm run build` déclenche `prisma generate` (avec le moteur musl) puis
# `next build` (sortie standalone).
RUN pnpm run build

# Le tracing de Next standalone n'embarque pas Prisma de façon fiable (surtout
# avec pnpm). On rassemble le client généré + le moteur de requêtes dans un
# emplacement fixe, façon npm (node_modules/@prisma/client + node_modules/.prisma).
RUN CLIENT_DIR="$(node -e "console.log(require('path').dirname(require.resolve('@prisma/client/package.json')))")" && \
    NM_DIR="$(dirname "$(dirname "$CLIENT_DIR")")" && \
    mkdir -p /prisma-runtime/@prisma && \
    cp -RL "$CLIENT_DIR" /prisma-runtime/@prisma/client && \
    cp -RL "$NM_DIR/.prisma" /prisma-runtime/.prisma

# ─── Étape 3 : image finale ───
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Sortie autonome de Next (serveur minimal + dépendances tracées).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Schéma Prisma + client généré et moteur musl (ajoutés au node_modules racine).
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /prisma-runtime ./node_modules/

USER nextjs
EXPOSE 3000

# server.js est produit par le build standalone ; il écoute sur PORT/HOSTNAME.
CMD ["node", "server.js"]
