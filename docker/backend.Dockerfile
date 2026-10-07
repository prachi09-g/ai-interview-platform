# syntax=docker/dockerfile:1
#
# Build context is the PROJECT ROOT, not backend/ — this is an npm
# workspaces monorepo (root package.json declares
# "workspaces": ["backend", "frontend"]), and `npm ci` validates the
# lockfile against every declared workspace's package.json. Both
# workspace manifests are copied into every deps-installing stage below
# (frontend/package.json only — never its source) purely so that
# validation doesn't fail on a "missing" workspace member; frontend
# dependencies themselves are never actually installed here.
#
# Build from the project root:
#   docker build -f docker/backend.Dockerfile -t ai-interview-backend .

# ============================================================================
# Stage 1 — deps: install once, cached across builds unless package*.json change
# ============================================================================
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY prisma ./prisma
RUN npm ci --workspace=backend

# ============================================================================
# Stage 2 — build: compile TypeScript and generate the Prisma client
# ============================================================================
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY prisma ./prisma
COPY backend ./backend

RUN npm run prisma:generate --workspace=backend
RUN npm run build --workspace=backend

# ============================================================================
# Stage 3 — production: only the compiled output + production deps
# ============================================================================
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY prisma ./prisma
RUN npm ci --workspace=backend --omit=dev

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Switches cwd to backend/ for the app's own runtime, not just this
# Dockerfile's npm-workspace commands above. This matters because
# StorageService's local-disk fallback resolves its upload directory via
# `process.cwd()` (storage.service.ts), while main.ts resolves the static
# file server's path via `__dirname` — those only agree if the process is
# actually running with backend/ as its cwd, which local dev gets for
# free (npm scripts run with cwd = the workspace directory) but a
# container does not unless set explicitly here.
WORKDIR /app/backend

# Pre-create the local-disk upload directory owned by the non-root user
# *before* USER node takes effect below. A named Docker volume mounted
# here (see docker-compose.yml) copies this directory's ownership on
# first mount — without this, the mount point would be root-owned and
# the node user's StorageService writes would fail with EACCES.
RUN mkdir -p uploads && chown -R node:node uploads

# Non-root user — the base image ships a "node" user (uid 1000) for this exact purpose.
USER node

EXPOSE 4000

# Migrations run as a separate `npm run prisma:deploy` step (see
# docker-compose.yml's backend command) rather than baked into the image
# ENTRYPOINT, so a redeploy without a schema change doesn't re-run them
# and a failed migration doesn't get masked by the app "succeeding" anyway.
CMD ["node", "dist/main.js"]
