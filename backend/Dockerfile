# ─── Étape 1 : dépendances complètes + build ───
FROM node:20-alpine AS builder

WORKDIR /app

# OpenSSL est requis par Prisma sur Alpine Linux
RUN apk add --no-cache openssl

COPY package*.json prisma.config.ts ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# `npm run build` = prisma generate + nest build
RUN npm run build

# ─── Étape 2 : dépendances de production uniquement ───
FROM node:20-alpine AS dependencies

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json prisma.config.ts ./
COPY prisma ./prisma/

RUN npm ci --omit=dev
RUN ./node_modules/.bin/prisma generate

# ─── Étape 3 : image finale ───
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma
# Indispensable à `prisma migrate deploy` : Prisma 7 y lit l'URL de la base.
COPY --from=dependencies /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
