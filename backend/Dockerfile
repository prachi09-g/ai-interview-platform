# syntax=docker/dockerfile:1

# ==============================================================================
# AI Interview Preparation & Evaluation Platform — Backend (NestJS) Dockerfile
#
# Build context must be the PROJECT ROOT, not backend/, since this image
# also needs ../prisma/schema.prisma (Prisma lives one level up per the npm
# workspace layout — see backend/package.json's --schema flags). From the
# project root:
#   docker build -f backend/Dockerfile -t ai-interview-backend .
# docker-compose.yml (in docker/) is already wired for this context.
# ==============================================================================

# ---- Stage 1: deps — full install (need the `prisma` CLI devDependency to run `generate`, and `typescript` to build) ----
FROM node:20-alpine AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install

# ---- Stage 2: builder — generate the Prisma client, compile TypeScript ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend ./backend
COPY prisma ./prisma
WORKDIR /app/backend
RUN npm run prisma:generate
RUN npm run build

# ---- Stage 3: production ----
# Deliberately carries the builder stage's already-resolved node_modules
# forward (including devDependencies) rather than running a second, fresh
# `npm install --omit=dev` here. That leaner-looking pattern has a
# well-known Prisma+Docker footgun: @prisma/client's postinstall hook
# tries to regenerate the client, and depending on exact Prisma version
# and whether the schema file is present in that stage, it can silently
# produce a stale/missing client or fail the build outright. Carrying
# node_modules forward (which already has a correctly generated client
# baked in from Stage 2, with zero risk of a second, different generation
# step running) trades a larger image for a class of build fragility this
# project has no way to test-build-and-verify in its own dev sandbox — the
# safer choice given that constraint. Pruning devDependencies is a
# reasonable follow-up once a real deployment target can validate the
# fresh-install path end to end.
FROM node:20-alpine AS production
WORKDIR /app/backend
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./package.json

RUN mkdir -p uploads && chown -R nestjs:nodejs /app/backend
USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
