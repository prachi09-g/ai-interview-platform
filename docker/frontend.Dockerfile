# syntax=docker/dockerfile:1
#
# Build context is the PROJECT ROOT (same npm-workspaces reasoning as
# backend.Dockerfile — see its header comment).
#
# Build from the project root:
#   docker build -f docker/frontend.Dockerfile -t ai-interview-frontend .

# ============================================================================
# Stage 1 — deps
# ============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace=frontend

# ============================================================================
# Stage 2 — build: Next.js standalone output (see next.config.ts's
# `output: 'standalone'` — produces a minimal self-contained server
# bundle instead of needing the full frontend/node_modules copied in)
# ============================================================================
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY frontend ./frontend

# Baked in at build time — Next.js inlines NEXT_PUBLIC_* vars into the
# client bundle during `next build`, so this can't be deferred to
# container start the way backend env vars can. Override via
# --build-arg when building for a different API origin.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build --workspace=frontend

# ============================================================================
# Stage 3 — production: the standalone server + static assets only
# ============================================================================
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# .next/standalone already includes a minimal node_modules with just the
# production deps actually used — nothing from Stage 1 needs copying here.
COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static ./frontend/.next/static
COPY --from=build /app/frontend/public ./frontend/public

USER node

EXPOSE 3000

# standalone's entry point is server.js at the copied workspace root
# (frontend/server.js), not a top-level file — Next.js preserves the
# monorepo's folder structure inside .next/standalone.
CMD ["node", "frontend/server.js"]
